import json

import frappe
from frappe.utils import flt


@frappe.whitelist()
def sales_order_query(
	doctype,
	txt,
	searchfield,
	start,
	page_length,
	filters=None,
	as_dict=False,
	reference_doctype=None,
	ignore_user_permissions=False,
):
	filters = json.loads(filters) if isinstance(filters, str) else filters or {}

	so_filters = {
		**filters,
		"docstatus": 0,
		"workflow_state": "To Bill",
	}

	data = frappe.get_list(
		"Sales Order",
		fields=["name", "transaction_date", "customer", "customer_name"],
		filters=so_filters,
		limit_start=start,
		limit_page_length=page_length,
		order_by="transaction_date desc, name desc",
	)

	for d in data:
		d.label = f"{d.name} | {d.transaction_date or ''} | {d.customer_name or d.customer or ''}"

	return data


@frappe.whitelist()
def make_purchase_invoice(source_name, target_doc=None, args=None):
	source = frappe.get_doc("Sales Order", source_name)

	if target_doc:
		target = frappe.get_doc(json.loads(target_doc))
	else:
		target = frappe.new_doc("Purchase Invoice")

	selected_items = []
	if isinstance(args, str):
		args = json.loads(args)
	if args:
		selected_items = args.get("filtered_children") or []

	for row in source.items:
		if selected_items and row.name not in selected_items:
			continue

		rate = flt(row.custom_cost)
		target.append(
			"items",
			{
				"item_code": row.item_code,
				"item_name": row.item_name,
				"description": row.description,
				"uom": row.uom,
				"qty": 1,
				"rate": rate,
				"custom_cost": row.custom_cost,
				"custom_total_cost": rate,
				"custom_customer_order": source.name,
			},
		)

	# Ambil branch/division dari SO pertama kalau target masih kosong
	if not target.get("custom_branch"):
		target.custom_branch = source.custom_branch
	if not target.get("custom_division"):
		target.custom_division = source.custom_division

	return target
