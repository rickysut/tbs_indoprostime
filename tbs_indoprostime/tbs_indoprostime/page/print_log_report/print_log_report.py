import frappe
from frappe import _


@frappe.whitelist()
def get_logs(start_date, end_date, doc_type=None):
    if not start_date or not end_date:
        frappe.throw(_("Start Date and End Date are required"))

    doctype_map = {
        "Customer Order": "Sales Order",
        "Customer Invoice": "Sales Invoice",
        "Vendor Invoice": "Purchase Invoice",
    }

    filters = {
        "subject": ["like", "Print:%"],
        "communication_date": ["between", [f"{start_date} 00:00:00", f"{end_date} 23:59:59"]],
    }

    if doc_type and doc_type in doctype_map:
        filters["reference_doctype"] = ["in", [doctype_map[doc_type]]]
    elif doc_type:
        frappe.throw(_("Invalid DocType filter"))

    return frappe.get_list(
        "Activity Log",
        filters=filters,
        fields=[
            "name",
            "communication_date",
            "subject",
            "status",
            "reference_doctype",
            "reference_name",
            "timeline_doctype",
            "timeline_name",
            "user",
            "full_name",
        ],
        order_by="communication_date desc",
    )
