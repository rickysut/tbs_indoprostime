# Copyright (c) 2026, Team ERP and Contributors
# For license information, please see license.txt

import frappe
import json
from frappe.utils import flt
from frappe.model.mapper import get_mapped_doc
from erpnext.selling.doctype.sales_order.sales_order import make_purchase_order as _make_purchase_original


@frappe.whitelist()
def make_purchase_order(source_name, selected_items=None, target_doc=None):
	"""Override ERPNext make_purchase_order to use custom_cost from Sales Order Item as rate."""

	if not selected_items:
		return

	if isinstance(selected_items, str):
		selected_items = json.loads(selected_items)

	items_to_map = [item.get("item_code") for item in selected_items if item.get("item_code")]
	items_to_map = list(set(items_to_map))

	def is_drop_ship_order(target):
		drop_ship = True
		for item in target.items:
			if not item.delivered_by_supplier:
				drop_ship = False
				break
		return drop_ship

	def set_missing_values(source, target):
		target.supplier = ""
		target.apply_discount_on = ""
		target.additional_discount_percentage = 0.0
		target.discount_amount = 0.0
		target.inter_company_order_reference = ""
		target.shipping_rule = ""
		target.tc_name = ""
		target.terms = ""
		target.payment_terms_template = ""
		target.payment_schedule = []

		if is_drop_ship_order(target):
			if source.shipping_address_name:
				target.shipping_address = source.shipping_address_name
				target.shipping_address_display = source.shipping_address
			else:
				target.shipping_address = source.customer_address
				target.shipping_address_display = source.address_display

			target.customer_contact_person = source.contact_person
			target.customer_contact_display = source.contact_display
			target.customer_contact_mobile = source.contact_mobile
			target.customer_contact_email = source.contact_email
		else:
			target.customer = target.customer_name = target.shipping_address = None

		target.run_method("set_missing_values")
		if not target.taxes:
			target.append_taxes_from_item_tax_template()
		target.run_method("calculate_taxes_and_totals")

	def update_item(source, target, source_parent):
		target.schedule_date = source.delivery_date
		target.qty = flt(source.qty) - (flt(source.ordered_qty) / flt(source.conversion_factor))
		target.stock_qty = flt(source.stock_qty) - flt(source.ordered_qty)
		target.project = source_parent.project

		# Set rate dari custom_cost Sales Order Item
		if source.custom_cost:
			target.rate = flt(source.custom_cost)
			target.price_list_rate = flt(source.custom_cost)

	def update_item_for_packed_item(source, target, source_parent):
		target.qty = flt(source.qty) - flt(source.ordered_qty)

		# Set rate dari custom_cost Sales Order Item (packed items)
		if source.custom_cost:
			target.rate = flt(source.custom_cost)
			target.price_list_rate = flt(source.custom_cost)

	doc = get_mapped_doc(
		"Sales Order",
		source_name,
		{
			"Sales Order": {
				"doctype": "Purchase Order",
				"field_no_map": [
					"address_display",
					"contact_display",
					"contact_mobile",
					"contact_email",
					"contact_person",
					"taxes_and_charges",
					"shipping_address",
					"dispatch_address",
				],
				"validation": {"docstatus": ["=", 1]},
			},
			"Sales Order Item": {
				"doctype": "Purchase Order Item",
				"field_map": [
					["name", "sales_order_item"],
					["parent", "sales_order"],
					["stock_uom", "stock_uom"],
					["uom", "uom"],
					["conversion_factor", "conversion_factor"],
					["delivery_date", "schedule_date"],
				],
				"field_no_map": [
					"rate",
					"price_list_rate",
					"item_tax_template",
					"discount_percentage",
					"discount_amount",
					"supplier",
					"pricing_rules",
				],
				"postprocess": update_item,
				"condition": lambda doc: doc.ordered_qty < doc.stock_qty
				and doc.item_code in items_to_map,
			},
			"Packed Item": {
				"doctype": "Purchase Order Item",
				"field_map": [
					["name", "sales_order_packed_item"],
					["parent", "sales_order"],
					["item_code", "item_code"],
					["qty", "qty"],
					["uom", "uom"],
					["warehouse", "warehouse"],
					["delivery_date", "schedule_date"],
				],
				"postprocess": update_item_for_packed_item,
			},
		},
		target_doc,
		set_missing_values,
	)

	return doc
