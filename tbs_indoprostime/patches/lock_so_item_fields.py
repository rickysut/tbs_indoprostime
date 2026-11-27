import frappe


def execute():
    """Add read_only_depends_on to Sales Order Item fields based on PI/SI link fields."""
    locked_fields = [
        # locked when either PI or SI exists
        ("item_code", ["custom_purchase_invoice", "custom_customer_invoice"]),
        ("qty", ["custom_purchase_invoice", "custom_customer_invoice"]),
        ("custom_cost", ["custom_purchase_invoice", "custom_customer_invoice"]),
        ("description", ["custom_purchase_invoice", "custom_customer_invoice"]),
        # locked only when SI exists
        ("uom", ["custom_customer_invoice"]),
        ("rate", ["custom_customer_invoice"]),
        ("discount_percentage", ["custom_customer_invoice"]),
        ("discount_amount", ["custom_customer_invoice"]),
    ]

    for fieldname, depends_on_fields in locked_fields:
        create_property_setter(fieldname, depends_on_fields)


def create_property_setter(fieldname, depends_on_fields):
    property_name = f"Sales Order Item-{fieldname}-read_only_depends_on"
    expression = " || ".join(f"doc.{f}" for f in depends_on_fields)
    value = f"eval:{expression}"

    if frappe.db.exists("Property Setter", property_name):
        ps = frappe.get_doc("Property Setter", property_name)
    else:
        ps = frappe.new_doc("Property Setter")
        ps.doctype_or_field = "DocField"
        ps.doc_type = "Sales Order Item"
        ps.field_name = fieldname
        ps.property = "read_only_depends_on"

    ps.value = value
    ps.name = property_name
    ps.save()
