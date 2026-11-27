import frappe


def execute():
    """Fix existing Sales Order Item read_only_depends_on expressions.

    The original lock_so_item_fields patch generated values like
    "eval: doc.custom_purchase_invoice || custom_customer_invoice",
    which is invalid because the second field name is not prefixed with "doc.".
    This patch overwrites those Property Setter values with the correct form.
    """
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
        property_name = f"Sales Order Item-{fieldname}-read_only_depends_on"
        expression = " || ".join(f"doc.{f}" for f in depends_on_fields)
        value = f"eval:{expression}"

        if frappe.db.exists("Property Setter", property_name):
            frappe.db.set_value("Property Setter", property_name, "value", value)
