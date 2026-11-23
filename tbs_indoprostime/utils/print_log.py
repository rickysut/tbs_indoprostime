import frappe
from frappe import _


@frappe.whitelist()
def log_print_activity(doctype, name, print_format=None, doctype_label=None):
    """Log a print event to Activity Log."""
    if not doctype or not name:
        return {"status": "error", "message": "DocType and name are required"}

    if not frappe.has_permission(doctype, "read", name):
        frappe.throw(_("No permission to access {0}").format(doctype), frappe.PermissionError)

    label = doctype_label or doctype

    frappe.get_doc({
        "doctype": "Activity Log",
        "subject": f"Print: {label} {name}",
        "operation": None,
        "reference_doctype": doctype,
        "reference_name": name,
        "user": frappe.session.user,
        "status": "Success",
    }).insert(ignore_permissions=True)

    return {"status": "success"}
