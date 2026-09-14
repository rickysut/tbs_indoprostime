import frappe

def set_custom_name(doc, method):
    if not doc.custom_code:
        frappe.throw("Custom Code wajib diisi untuk membuat Warehouse")
    doc.name = doc.custom_code