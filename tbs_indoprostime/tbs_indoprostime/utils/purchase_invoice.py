import json

import frappe
from frappe.utils import flt


@frappe.whitelist()
def get_used_so_item_details(so_name):
	used = frappe.db.sql(
		"""
		SELECT pi_item.custom_so_detail
		FROM `tabPurchase Invoice Item` pi_item
		JOIN `tabPurchase Invoice` pi ON pi.name = pi_item.parent
		JOIN `tabSales Order Item` soi ON soi.name = pi_item.custom_so_detail
		WHERE pi_item.custom_customer_order = %s
		  AND pi.docstatus != 2
		  AND IFNULL(pi_item.custom_so_detail, '') != ''
		  AND soi.parent = %s
		""",
		(so_name, so_name),
		as_list=True,
	)
	return [row[0] for row in used]


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
	exclude_so_details = filters.pop("exclude_so_details", []) or []

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

	result = []
	for d in data:
		total = frappe.db.count("Sales Order Item", {"parent": d.name})
		used = frappe.db.sql(
			"""
			SELECT COUNT(DISTINCT pii.custom_so_detail)
			FROM `tabPurchase Invoice Item` pii
			JOIN `tabPurchase Invoice` pi ON pi.name = pii.parent
			JOIN `tabSales Order Item` soi ON soi.name = pii.custom_so_detail
			WHERE pii.custom_customer_order = %s
			  AND pi.docstatus != 2
			  AND IFNULL(pii.custom_so_detail, '') != ''
			  AND soi.parent = %s
			""",
			(d.name, d.name),
		)[0][0]
		available = total - used
		if available <= 0:
			continue
		result.append([
			d.name,
			f"{d.transaction_date or ''} | {d.customer_name or d.customer or ''} | {available} item(s) available",
		])

	return result


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
				"custom_so_detail": row.name,
			},
		)

	# Ambil branch/division dari SO pertama kalau target masih kosong
	if not target.get("custom_branch"):
		target.custom_branch = source.custom_branch
	if not target.get("custom_division"):
		target.custom_division = source.custom_division

	return target
