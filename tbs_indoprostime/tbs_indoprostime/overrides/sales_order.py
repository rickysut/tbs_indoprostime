# Copyright (c) 2026, Team ERP and Contributors
# For license information, please see license.txt

import frappe
import json
from frappe import _
from frappe.utils import flt
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
		self.po_no = f"{division}-{name_without_division}"

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

	def update_rate(self):
		if self.custom_division == "AC":
			self._update_rate_ac()
		elif self.custom_division == "SC":
			self._update_rate_sc()

	def _update_rate_ac(self):
		if not self.customer:
			return

		settings_name = frappe.db.get_value(
			"Air Freight Settings", {"customer": self.customer}, "name"
		)
		if not settings_name:
			return

		settings = frappe.get_doc("Air Freight Settings", settings_name)
		weight = flt(self.custom_chgbl_weight)
		if weight <= 0:
			return

		conversion_rate = flt(self.custom_kurs) or flt(self.conversion_rate) or 1

		# Handling
		if flt(settings.handling_min_price) > 0:
			handling_min_kg = flt(settings.handling_min_kg)
			handling_min_price = flt(settings.handling_min_price)
			handling_greater_price = flt(settings.handling_greater_price)

			if weight <= handling_min_kg:
				amount = handling_min_price
			else:
				amount = (weight - handling_min_kg) * handling_greater_price + handling_min_price

			description = (
				"HANDLING"
				if weight <= handling_min_kg
				else f"HANDLING ({weight:,.0f}-{handling_min_kg:,.0f}) x {handling_greater_price:,.0f} + {handling_min_price:,.0f}"
			)
			self._upsert_rate_item(settings.handling_item, description, 1, amount)

		# Trucking (menggunakan harga Box)
		if flt(settings.box_min_price) > 0:
			truck_min_kg = flt(settings.box_min_kg)
			truck_min_price = flt(settings.box_min_price)
			truck_greater_price = flt(settings.box_greater_price)

			if weight <= truck_min_kg:
				amount = truck_min_price
			else:
				amount = (weight - truck_min_kg) * truck_greater_price + truck_min_price

			description = (
				"TRUCKING"
				if weight <= truck_min_kg
				else f"TRUCKING ({weight:,.0f}-{truck_min_kg:,.0f}) x {truck_greater_price:,.0f} + {truck_min_price:,.0f}"
			)
			self._upsert_rate_item(settings.trucking_item, description, 1, amount)

		# Agency Fee (USD -> IDR)
		if flt(settings.agency_fee) > 0:
			amount_usd = flt(settings.agency_fee)
			amount_idr = amount_usd * conversion_rate
			description = f"AGENCY FEE (USD {amount_usd:,.2f} x {conversion_rate:,.2f})"
			self._upsert_rate_item(settings.agency_item, description, 1, amount_idr)

		# Document Fee
		if flt(settings.document_fee) > 0:
			self._upsert_rate_item(settings.document_item, "DOCUMENT FEE", 1, flt(settings.document_fee))

		# Admin Fee
		if flt(settings.admin_fee) > 0:
			self._upsert_rate_item(settings.admin_item, "ADM FEE", 1, flt(settings.admin_fee))

		# Manifest Fee
		if flt(settings.manifest_fee) > 0:
			self._upsert_rate_item(settings.manifest_item, "MANIFEST FEE", 1, flt(settings.manifest_fee))

	def _update_rate_sc(self):
		if not self.customer:
			return

		settings_name = frappe.db.get_value(
			"Sea Freight Settings", {"customer": self.customer}, "name"
		)
		if not settings_name:
			return

		settings = frappe.get_doc("Sea Freight Settings", settings_name)

		fcl_40 = flt(self.custom_fcl_40_ft20_ft)
		fcl_20 = flt(self.custom_fcl_40_ft20_ft_2)
		lcl_cbm = flt(self.custom_fcllcl_vol)

		# Custom Clearance
		if lcl_cbm > 0:
			threshold = flt(settings.clearance_min_cbm)
			base = flt(settings.clearance_min_cbm_price)
			per_cbm = flt(settings.clearance_greater_price)

			if lcl_cbm <= threshold:
				amount = base
			else:
				amount = (lcl_cbm - threshold) * per_cbm + base

			description = (
				"CUSTOM CLEARANCE LCL"
				if lcl_cbm <= threshold
				else f"CUSTOM CLEARANCE LCL ({lcl_cbm:,.0f}-{threshold:,.0f}) x {per_cbm:,.0f} + {base:,.0f}"
			)
			self._upsert_rate_item(settings.clearance_item, description, 1, amount)
		elif fcl_20 or fcl_40:
			amount = 0
			if fcl_20:
				amount += flt(settings.clearance_fcl_20) + max(fcl_20 - 1, 0) * flt(settings.clearance_add_container)
			if fcl_40:
				amount += flt(settings.clearance_fcl_40) + max(fcl_40 - 1, 0) * flt(settings.clearance_add_container)

			self._upsert_rate_item(settings.clearance_item, "CUSTOM CLEARANCE FCL", 1, amount)

		# Trucking
		if lcl_cbm > 0:
			if lcl_cbm > 10:
				threshold = flt(settings.fuso_min_cbm)
				base = flt(settings.fuso_min_price)
				per_cbm = flt(settings.fuso_greater_price)
				tier_label = "FUSO"
			else:
				threshold = flt(settings.box_min_cbm)
				base = flt(settings.box_min_price)
				per_cbm = flt(settings.box_greater_price)
				tier_label = "BOX"

			if lcl_cbm <= threshold:
				amount = base
			else:
				amount = (lcl_cbm - threshold) * per_cbm + base

			description = (
				f"TRUCKING LCL {tier_label}"
				if lcl_cbm <= threshold
				else f"TRUCKING LCL {tier_label} ({lcl_cbm:,.0f}-{threshold:,.0f}) x {per_cbm:,.0f} + {base:,.0f}"
			)
			self._upsert_rate_item(settings.trucking_item, description, 1, amount)
		elif fcl_20 or fcl_40:
			amount = fcl_20 * flt(settings.trucking_fcl_20) + fcl_40 * flt(settings.trucking_fcl_40)
			self._upsert_rate_item(settings.trucking_item, "TRUCKING FCL", 1, amount)

		# Admin Fee
		if flt(settings.admin_fee) > 0:
			self._upsert_rate_item(settings.admin_item, "ADM FEE", 1, flt(settings.admin_fee))

		# PIB EDI
		if flt(settings.pib_edi_fee) > 0:
			self._upsert_rate_item(settings.pib_edi_item, "PIB EDI", 1, flt(settings.pib_edi_fee))

		# Agency Fee
		if flt(settings.agency_fee) > 0:
			self._upsert_rate_item(settings.agency_item, "Agency Fee", 1, flt(settings.agency_fee))

	def _upsert_rate_item(self, item_code, description, qty, amount):
		if not item_code:
			return

		for row in self.items:
			if row.item_code == item_code:
				row.qty = qty
				row.rate = amount
				row.amount = qty * amount
				row.custom_cost = amount
				row.custom_total_cost = qty * amount
				row.description = description
				if not row.conversion_factor:
					row.conversion_factor = 1
				if not row.price_list_rate:
					row.price_list_rate = amount
				return

		item = frappe.db.get_value("Item", item_code, ["item_name", "stock_uom"], as_dict=True)
		if not item:
			return

		self.append("items", {
			"item_code": item_code,
			"item_name": item.item_name,
			"description": description,
			"qty": qty,
			"rate": amount,
			"amount": qty * amount,
			"price_list_rate": amount,
			"custom_cost": amount,
			"custom_total_cost": qty * amount,
			"uom": item.stock_uom,
			"stock_uom": item.stock_uom,
			"conversion_factor": 1,
		})

	def before_save(self):
		self.set_title()
		self.update_rate()
		if self.get("items") and self.get("payment_schedule"):
			self.payment_schedule = []

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
