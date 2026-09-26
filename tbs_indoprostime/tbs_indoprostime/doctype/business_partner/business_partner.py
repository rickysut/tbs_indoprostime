# Copyright (c) 2026, Team ERP and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class BusinessPartner(Document):
	def on_update(self):
		self.sync_customer_and_supplier()

	def after_insert(self):
		self.sync_customer_and_supplier()

	def sync_customer_and_supplier(self):
		self.sync_customer()
		self.sync_supplier()

	def sync_customer(self):
		if not self.customer:
			return

		existing = frappe.db.exists("Customer", self.bp_code)
		customer = frappe.get_doc("Customer", self.bp_code) if existing else frappe.new_doc("Customer")

		customer.update({
			"customer_name": self.partner_name,
			"customer_type": self.partner_type or "Company",
			"customer_group": self.get_customer_group(),
			"territory": self.territory or frappe.db.get_single_value("Selling Settings", "territory") or "All Territories",
			"industry": self.industry,
			"default_currency": self.currency,
			"default_price_list": self.price_list,
			"tax_id": self.tax_id,
			"tax_category": self.tax_category,
			"tax_withholding_category": self.tax_withholding_category,
			"payment_terms": self.get_payment_terms(),
			"credit_limit": self.credit_limit,
			"custom_customer_code": self.name,
		})

		if existing:
			customer.save()
		else:
			customer.name = self.bp_code
			customer.insert()

	def sync_supplier(self):
		if not self.vendor:
			return

		existing = frappe.db.exists("Supplier", self.bp_code)
		supplier = frappe.get_doc("Supplier", self.bp_code) if existing else frappe.new_doc("Supplier")

		supplier.update({
			"supplier_name": self.partner_name,
			"supplier_type": self.partner_type or "Company",
			"supplier_group": self.get_supplier_group(),
			"country": self.country,
			"default_currency": self.currency,
			"default_price_list": self.price_list,
			"tax_id": self.tax_id,
			"tax_category": self.tax_category,
			"tax_withholding_category": self.tax_withholding_category,
			"payment_terms": self.get_payment_terms(),
			"custom_supplier_code": self.name,
		})

		if existing:
			supplier.save()
		else:
			supplier.name = self.bp_code
			supplier.insert()

	def get_customer_group(self):
		default_group = frappe.db.get_single_value("Selling Settings", "customer_group")
		if default_group and frappe.db.exists("Customer Group", default_group):
			return default_group

		default_group = frappe.db.get_value("Customer Group", {"is_group": 0}, "name")
		if default_group:
			return default_group

		return None

	def get_supplier_group(self):
		default_group = frappe.db.get_single_value("Buying Settings", "supplier_group")
		if default_group and frappe.db.exists("Supplier Group", default_group):
			return default_group

		default_group = frappe.db.get_value("Supplier Group", {"is_group": 0}, "name")
		if default_group:
			return default_group

		return None

	def get_payment_terms(self):
		if not self.payment_term:
			return None

		if frappe.db.exists("Payment Terms Template", self.payment_term):
			return self.payment_term

		return None
