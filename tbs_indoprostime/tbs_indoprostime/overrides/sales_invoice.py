# Copyright (c) 2026, Team ERP and Contributors
# For license information, please see license.txt

import frappe
from erpnext.accounts.doctype.sales_invoice.sales_invoice import SalesInvoice


class CustomSalesInvoice(SalesInvoice):
	"""Custom Sales Invoice controller for TBS Indoprostime app."""

	def on_submit(self):
		super().on_submit()
		self.update_sales_order_posted()

	def update_sales_order_posted(self):
		"""Update custom_posted on linked Sales Orders."""
		sales_orders = set()
		for item in self.items:
			if item.sales_order:
				sales_orders.add(item.sales_order)

		for so_name in sales_orders:
			frappe.db.set_value(
				"Sales Order",
				so_name,
				"custom_posted",
				frappe.utils.now(),
				update_modified=False,
			)
