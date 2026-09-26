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
		existing = frappe.db.exists("Customer", self.bp_code)

		if not self.customer:
			if existing:
				customer = frappe.get_doc("Customer", self.bp_code)
				customer.disabled = 1
				customer.save()
			return

		customer = frappe.get_doc("Customer", self.bp_code) if existing else frappe.new_doc("Customer")

		customer.update({
			"customer_name": self.partner_name,
			"customer_type": self.partner_type or "Company",
			"customer_group": self.customer_group or self.get_customer_group(),
			"territory": self.territory or frappe.db.get_single_value("Selling Settings", "territory") or "All Territories",
			"industry": self.industry,
			"default_currency": self.currency,
			"default_price_list": self.selling_price_list,
			"default_bank_account": self.company_bank_account,
			"disabled": self.disable,
			"tax_id": self.tax_id,
			"tax_category": self.tax_category,
			"tax_withholding_category": self.tax_withholding_category,
			"payment_terms": self.get_payment_terms(self.selling_payment_term),
			"custom_customer_code": self.name,
		})

		self.set_party_account(customer, self.receivable_account, self.customer_advance_account)
		self.set_credit_limit(customer)

		if existing:
			customer.save()
		else:
			customer.name = self.bp_code
			customer.insert()

	def sync_supplier(self):
		existing = frappe.db.exists("Supplier", self.bp_code)

		if not self.vendor:
			if existing:
				supplier = frappe.get_doc("Supplier", self.bp_code)
				supplier.disabled = 1
				supplier.save()
			return

		supplier = frappe.get_doc("Supplier", self.bp_code) if existing else frappe.new_doc("Supplier")

		supplier.update({
			"supplier_name": self.partner_name,
			"supplier_type": self.partner_type or "Company",
			"supplier_group": self.vendor_group or self.get_supplier_group(),
			"country": self.country,
			"default_currency": self.currency,
			"default_price_list": self.buying_price_list,
			"default_bank_account": self.company_bank_account,
			"disabled": self.disable,
			"tax_id": self.tax_id,
			"tax_category": self.tax_category,
			"tax_withholding_category": self.tax_withholding_category,
			"payment_terms": self.get_payment_terms(self.buying_payment_term),
			"on_hold": self.on_hold,
			"hold_type": self.hold_type,
			"release_date": self.hold_release_date,
			"custom_supplier_code": self.name,
		})

		self.set_party_account(supplier, self.payable_account, self.vendor_advance_account)

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

	def get_payment_terms(self, payment_term):
		if not payment_term:
			return None

		if frappe.db.exists("Payment Terms Template", payment_term):
			return payment_term

		return None

	def get_default_company(self):
		return frappe.defaults.get_user_default("Company") or frappe.db.get_single_value("Global Defaults", "default_company")

	def set_party_account(self, party, account, advance_account):
		if not (account or advance_account):
			return

		company = self.get_default_company()
		if not company:
			return

		row = None
		for existing_row in party.get("accounts"):
			if existing_row.company == company:
				row = existing_row
				break

		if not row:
			row = party.append("accounts", {"company": company})

		if account:
			row.account = account
		if advance_account:
			row.advance_account = advance_account

	def set_credit_limit(self, customer):
		if not self.credit_limit:
			return

		company = self.get_default_company()
		if not company:
			return

		row = None
		for existing_row in customer.get("credit_limits"):
			if existing_row.company == company:
				row = existing_row
				break

		if not row:
			row = customer.append("credit_limits", {"company": company})

		row.credit_limit = self.credit_limit
