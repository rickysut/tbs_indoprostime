// Copyright (c) 2026, Team ERP and contributors
// For license information, please see license.txt

frappe.ui.form.on("Business Partner", {
	refresh(frm) {
		set_link_filters(frm);

		setTimeout(() => {
			const dashboard = frm.dashboard?.wrapper || $('.form-dashboard').first();
			const column = $('[data-fieldname="column_connection"]');
			const tabLink = $('.form-tabs .nav-link').filter(function () {
				return $(this).text().trim() === 'Connections';
			});

			const hasPerm = (frm.perm || []).some(p => p.permlevel >= 1 && p.read);

			if (!hasPerm) {
				dashboard.hide();
				tabLink.closest('li').hide();

				if (tabLink.hasClass('active')) {
					$('.form-tabs .nav-link').filter(function () {
						return $(this).text().trim() === 'Details';
					}).tab('show');
				}
				return;
			}

			tabLink.closest('li').show();
			if (column.length) {
				column.append(dashboard);
			}
		}, 200);
	},

	bp_code(frm) {
		set_link_filters(frm);
	},

	new_address(frm) {
		open_address_dialog(frm);
	},

	new_contact(frm) {
		open_contact_dialog(frm);
	},
});

function set_link_filters(frm) {
	["primary_address", "primary_contact"].forEach(fieldname => {
		frm.set_query(fieldname, function () {
			return {
				filters: {
					link_doctype: "Business Partner",
					link_name: frm.doc.bp_code,
				},
			};
		});
	});
}

function open_address_dialog(frm) {
	if (!frm.doc.bp_code) {
		frappe.throw(__("BP Code harus diisi terlebih dahulu."));
	}

	const d = new frappe.ui.Dialog({
		title: __("New Address"),
		fields: [
			{ fieldname: "address_type", label: __("Address Type"), fieldtype: "Select", options: "Billing\nShipping\nOffice\nPersonal\nOther", reqd: 1 },
			{ fieldname: "address_line1", label: __("Address Line 1"), fieldtype: "Data", reqd: 1 },
			{ fieldname: "address_line2", label: __("Address Line 2"), fieldtype: "Data" },
			{ fieldname: "col_break_1", fieldtype: "Column Break" },
			{ fieldname: "state", label: __("State/Province"), fieldtype: "Data" },
			{ fieldname: "city", label: __("City/Town"), fieldtype: "Data" },
			{ fieldname: "country", label: __("Country"), fieldtype: "Link", options: "Country" },
			{ fieldname: "pincode", label: __("Postal Code"), fieldtype: "Data" },
		],
		primary_action_label: __("Save"),
		primary_action(values) {
			frappe.db.insert({
				doctype: "Address",
				address_type: values.address_type,
				address_line1: values.address_line1,
				address_line2: values.address_line2,
				city: values.city,
				state: values.state,
				country: values.country,
				pincode: values.pincode,
				links: [
					{
						link_doctype: "Business Partner",
						link_name: frm.doc.bp_code,
					},
				],
			}).then(doc => {
				frm.set_value("primary_address", doc.name);
				frm.refresh_field("primary_address");
				d.hide();
				frappe.show_alert({
					message: __("Address {0} berhasil dibuat.", [doc.name]),
					indicator: "green",
				});
			}).catch(err => {
				frappe.msgprint(err.message || __("Gagal membuat Address."));
			});
		},
	});

	d.show();
}

function open_contact_dialog(frm) {
	if (!frm.doc.bp_code) {
		frappe.throw(__("BP Code harus diisi terlebih dahulu."));
	}

	const d = new frappe.ui.Dialog({
		title: __("New Contact"),
		fields: [
			{ fieldname: "first_name", label: __("First Name"), fieldtype: "Data", reqd: 1 },
			{ fieldname: "last_name", label: __("Last Name"), fieldtype: "Data" },
			{ fieldname: "col_break_1", fieldtype: "Column Break" },
			{ fieldname: "email_id", label: __("Email Address"), fieldtype: "Data" },
			{ fieldname: "phone", label: __("Phone"), fieldtype: "Data" },
			{ fieldname: "custom_fax", label: __("Fax"), fieldtype: "Data" },
			{ fieldname: "mobile_no", label: __("Mobile Phone"), fieldtype: "Data" },
			{ fieldname: "designation", label: __("Designation"), fieldtype: "Data" },
		],
		primary_action_label: __("Save"),
		primary_action(values) {
			const phone_nos = [];
			if (values.phone) {
				phone_nos.push({ phone: values.phone, is_primary_phone: 1 });
			}
			if (values.mobile_no) {
				phone_nos.push({ phone: values.mobile_no, is_primary_mobile_no: 1 });
			}

			const email_ids = [];
			if (values.email_id) {
				email_ids.push({ email_id: values.email_id, is_primary: 1 });
			}

			frappe.db.insert({
				doctype: "Contact",
				first_name: values.first_name,
				last_name: values.last_name,
				custom_fax: values.custom_fax,
				designation: values.designation,
				phone_nos: phone_nos,
				email_ids: email_ids,
				links: [
					{
						link_doctype: "Business Partner",
						link_name: frm.doc.bp_code,
					},
				],
			}).then(doc => {
				frm.set_value("primary_contact", doc.name);
				frm.refresh_field("primary_contact");
				d.hide();
				frappe.show_alert({
					message: __("Contact {0} berhasil dibuat.", [doc.name]),
					indicator: "green",
				});
			}).catch(err => {
				frappe.msgprint(err.message || __("Gagal membuat Contact."));
			});
		},
	});

	d.show();
}
