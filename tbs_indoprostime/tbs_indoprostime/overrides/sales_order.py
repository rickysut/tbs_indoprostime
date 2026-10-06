# Copyright (c) 2026, Team ERP and Contributors
# For license information, please see license.txt

import frappe
import json
from frappe import _
from erpnext.selling.doctype.sales_order.sales_order import SalesOrder


class CustomSalesOrder(SalesOrder):
	"""Custom Sales Order controller for TBS Indoprostime app."""

	def autoname(self):
		from frappe.model.naming import make_autoname

		if not self.custom_division:
			frappe.throw(_("Division is required for Sales Order naming"))

		division_code = frappe.db.get_value("Division", self.custom_division, "division_code")
		if not division_code:
			frappe.throw(_("Division Code is missing in Division master"))

		prefix = f"{division_code}.-.YYYY.MM.###"
		self.name = make_autoname(prefix)


	def set_title(self):
		customer = self.customer or ""
		division = self.custom_division or ""
		name_without_division = self.name
		if division and self.name:
			name_without_division = self.name[-9:]
		self.title = f"{division}{customer}-{name_without_division}"
		self.po_no = f"{division}{name_without_division}"

	# def before_validate(self):
	# 	self.ensure_items()

	# def ensure_items(self):
	# 	"""Ensure at least 1 item exists in items table."""
	# 	if not self.items:
	# 		if not self.custom_division:
	# 			frappe.throw(_("Division is required to auto-add default item."))

	# 		item_code = f"{self.custom_division}000"
	# 		item_doc = frappe.db.get_value("Item", item_code, ["item_name", "stock_uom"], as_dict=True)

	# 		if item_doc:
	# 			self.append("items", {
	# 				"item_code": item_code,
	# 				"item_name": item_doc.item_name or item_code,
	# 				"uom": item_doc.stock_uom or "Unit",
	# 				"qty": 1,
	# 				"rate": 0,
	# 				"amount": 0,
	# 			})

	def before_save(self):
		self.set_title()

	def validate(self):
		if not self.get("items"):
			self.grand_total = self.grand_total or 0
			self.rounded_total = self.rounded_total or 0
			self.base_grand_total = self.base_grand_total or 0
		# Overwrite sebelum parent validate berjalan
		if self.custom_kurs and self.custom_kurs > 0:
			self.conversion_rate = self.custom_kurs
		super().validate()
	
	def set_payment_schedule(self):
		if not self.get("items"):
			return
		super().set_payment_schedule()

	def set_total_in_words(self):
		if not self.get("items"):
			self.in_words = ""
			self.base_in_words = ""
			return
		super().set_total_in_words()


	def before_submit(self):
		if not self.get("items"):
			frappe.throw(_("Cost required before submit!"))

	def on_cancel(self):
		self.custom_voided = frappe.utils.now()
		super().on_cancel()

@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def exporter_shipper_query(doctype, txt, searchfield, start, page_len, filters):
	return frappe.db.sql(
		"""
		SELECT name, partner_name
		FROM `tabBusiness Partner`
		WHERE (exporter = 1 OR shipper = 1)
		  AND (name LIKE %(txt)s OR partner_name LIKE %(txt)s)
		ORDER BY name
		LIMIT %(start)s, %(page_len)s
		""",
		{"txt": f"%{txt}%", "start": start, "page_len": page_len},
	)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def importer_consignee_query(doctype, txt, searchfield, start, page_len, filters):
	return frappe.db.sql(
		"""
		SELECT name, partner_name
		FROM `tabBusiness Partner`
		WHERE (consignee = 1 OR importer = 1)
		  AND (name LIKE %(txt)s OR partner_name LIKE %(txt)s)
		ORDER BY name
		LIMIT %(start)s, %(page_len)s
		""",
		{"txt": f"%{txt}%", "start": start, "page_len": page_len},
	)


@frappe.whitelist()
def get_project_and_cost_center(division):
	if not division:
		return {}

	division_name = frappe.db.get_value("Division", division, "description")
	if not division_name:
		return {}

	project = frappe.db.get_value(
		"Project",
		{"project_name": division_name, "status": "Open"},
		["name", "cost_center"],
		as_dict=True,
	)

	if not project:
		return {}

	return {
		"project": project.name,
		"cost_center": project.cost_center,
	}
