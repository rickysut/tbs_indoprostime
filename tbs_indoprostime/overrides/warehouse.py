import frappe

def set_custom_name(doc, method):
    if frappe.flags.in_setup_wizard or frappe.flags.in_install or frappe.flags.in_migrate:
        return
    if not doc.custom_code:
        frappe.throw("Custom Code wajib diisi untuk membuat Warehouse")
    doc.name = doc.custom_code
