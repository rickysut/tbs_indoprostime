import frappe


def execute():
    total = 0
    created = 0
    skipped = 0
    failed = 0

    for np in frappe.get_all("Notify Party", fields=["*"], order_by="notify_code"):
        total += 1
        if frappe.db.exists("Business Partner", np.notify_code):
            skipped += 1
            print(f"[{total}] {np.notify_code} skipped (total={total}, created={created}, skipped={skipped}, failed={failed})")
            continue

        try:
            bp = _create_business_partner(np)
            created += 1
        except Exception as e:
            failed += 1
            frappe.log_error(
                title="Migrate Notify Party to Business Partner",
                message=f"Notify Code {np.notify_code}: {e}",
            )
            print(f"[{total}] {np.notify_code} failed (total={total}, created={created}, skipped={skipped}, failed={failed})")
            continue

        try:
            _create_address(np, bp)
        except Exception as e:
            frappe.log_error(
                title="Migrate Notify Party to Business Partner - Address",
                message=f"Notify Code {np.notify_code}: {e}",
            )

        try:
            _create_contact(np, bp)
        except Exception as e:
            frappe.log_error(
                title="Migrate Notify Party to Business Partner - Contact",
                message=f"Notify Code {np.notify_code}: {e}",
            )

        if bp.primary_address or bp.primary_contact:
            try:
                bp.save(ignore_permissions=True)
            except Exception as e:
                frappe.log_error(
                    title="Migrate Notify Party to Business Partner - Save BP",
                    message=f"Notify Code {np.notify_code}: {e}",
                )

        print(f"[{total}] {np.notify_code} ok (total={total}, created={created}, skipped={skipped}, failed={failed})")
        frappe.db.commit()

    print(f"Migrate Notify Party selesai: total={total}, created={created}, skipped={skipped}, failed={failed}")


def _create_business_partner(np):
    bp = frappe.new_doc("Business Partner")
    bp.update(
        {
            "bp_code": np.notify_code,
            "partner_name": np.notify_name,
            "notify": 1,
            "customer": 0,
            "vendor": 0,
            "consignee": 0,
            "shipper": 0,
            "agent": 0,
            "importer": 0,
            "exporter": 0,
        }
    )
    bp.insert(ignore_permissions=True)
    return bp


def _create_address(np, bp):
    country = (np.country or "").strip()
    if not country:
        return

    address_lines = [
        line
        for line in [
            np.address_1,
            np.address_2,
            np.address_3,
            np.address_4,
            np.address_5,
        ]
        if line
    ]
    address_line1 = address_lines[0] if address_lines else np.notify_name

    address = frappe.new_doc("Address")
    address.update(
        {
            "address_type": "Office",
            "address_line1": address_line1,
            "address_line2": ", ".join(address_lines[1:]) if len(address_lines) > 1 else None,
            "city": np.address_3,
            "state": np.address_4,
            "pincode": np.address_5,
            "country": country,
            "links": [
                {
                    "link_doctype": "Business Partner",
                    "link_name": bp.bp_code,
                }
            ],
        }
    )
    address.insert(ignore_permissions=True)
    bp.primary_address = address.name


def _create_contact(np, bp):
    if not (np.contact_name or np.contact_phone or np.contact_email):
        return

    names = (np.contact_name or "").strip().split(None, 1)
    first_name = names[0] if names else "-"
    last_name = names[1] if len(names) > 1 else ""

    contact = frappe.new_doc("Contact")
    contact.update(
        {
            "first_name": first_name,
            "last_name": last_name,
            "custom_fax": np.contact_fax,
            "links": [
                {
                    "link_doctype": "Business Partner",
                    "link_name": bp.bp_code,
                }
            ],
        }
    )
    if np.contact_phone:
        contact.append(
            "phone_nos",
            {"phone": np.contact_phone, "is_primary_phone": 1},
        )
    if np.contact_email:
        contact.append(
            "email_ids",
            {"email_id": np.contact_email, "is_primary": 1},
        )
    contact.insert(ignore_permissions=True)
    bp.primary_contact = contact.name
