# Copyright (c) 2026, Team ERP and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class ConsoleEntry(Document):
	def autoname(self):
		from frappe.model.naming import make_autoname

		if not self.division:
			frappe.throw(_("Division is required for Console Entry naming"))

		division_code = frappe.db.get_value("Division", self.division, "division_code")
		if not division_code:
			frappe.throw(_("Division Code is missing in Division master"))

		prefix = f"CE-.{division_code}.-.YYYY.MM.###"
		self.name = make_autoname(prefix)

	def set_title(self):
		division = self.division or ""
		name_without_division = self.name
		if division and self.name:
			name_without_division = self.name[-9:]
		# self.job_id = f"{division}-{name_without_division}"
		self.title = f"CE-{division}-{name_without_division}"

	def before_save(self):
		self.set_title()

	def on_submit(self):
		self.create_sales_orders()

	def create_sales_orders(self):
		master_customer = get_console_customer("MC")
		child_customer = get_console_customer("CC")

		if not master_customer or not child_customer:
			frappe.throw(_("Customer Master Console (MC) atau Child Console (CC) tidak ditemukan"))

		if frappe.db.exists("Sales Order", {"custom_master_console": self.name}):
			frappe.throw(_("Sales Order child sudah dibuat untuk Console Entry ini"))

		if frappe.db.exists("Sales Order", {"po_no": self.job_id, "customer": master_customer}):
			frappe.throw(_("Master Sales Order sudah dibuat untuk Console Entry ini"))

		company = frappe.defaults.get_user_default("Company") or frappe.db.get_single_value("Global Defaults", "default_company")
		if not company:
			frappe.throw(_("Company default belum diatur"))

		# Master Sales Order
		master_so = self.make_sales_order(customer=master_customer, company=company, master_id=None)
		master_so.insert()
		# self.db_set("master_sales_order", master_so.name)
		self.db_set("job_id", master_so.po_no)
		masterid = master_so.po_no
		# frappe.db.set_value("Console Entry", self.name, "job_id", master_so.po_no)
		# frappe.db.set_value("Console Entry", self.name, "master_sales_order", master_so.name)

		# Child Sales Orders
		from frappe.utils import cint

		for _ in range(cint(self.total_h_bl) or 0):
			child_so = self.make_sales_order(customer=child_customer, company=company, is_child=True, master_id=masterid)
			child_so.insert()

	def make_sales_order(self, customer, company, is_child=False, master_id=None):
		from frappe.utils import nowdate, cint

		so = frappe.new_doc("Sales Order")
		so.customer = customer
		so.company = company
		so.transaction_date = nowdate()
		so.delivery_date = self.eta or self.etd or nowdate()
		# if is_child==False:
		# 	so.po_no = self.job_id

		# Mapping Console Entry -> Sales Order
		so.custom_branch = self.branch
		so.custom_division = self.division
		so.custom_sales = self.sales
		so.custom_mbl = self.m_bl
		so.custom_origin = self.origin
		so.custom_destination = self.destination
		so.custom_etd = self.etd
		so.custom_eta = self.eta
		so.custom_shipping_line = self.shipping_line
		so.custom_overseas_agent = self.overseas_agent
		so.custom_feeder_ves_ = self.feeder_ves
		so.custom_mother_ves = self.mother_ves
		so.custom_ctnr__seal = self.ctr_seal
		so.custom_freight = self.freight
		so.custom_fcl_40_ft20_ft = self.fcl_4020
		so.custom_fcl_40_ft20_ft_2 = self.fcl_2
		so.custom_fcllcl_vol = self.fcllcl_vol
		so.custom_fcllcl_vol_2 = self.lcl_2

		if is_child:
			so.custom_master_console = master_id

		# Project & Cost Center dari Division
		project, cost_center = get_project_and_cost_center_by_division(self.division)
		if project:
			so.project = project
		if cost_center:
			so.cost_center = cost_center

		# Currency default perusahaan
		company_currency = frappe.db.get_value("Company", company, "default_currency")
		if company_currency:
			so.currency = company_currency
			so.conversion_rate = 1.0

		return so


def get_console_customer(code):
	return frappe.db.get_value("Customer", {"custom_customer_code": code}, "name")


def get_project_and_cost_center_by_division(division):
	division_name = frappe.db.get_value("Division", division, "description")
	if not division_name:
		return None, None

	project = frappe.db.get_value(
		"Project",
		{"project_name": division_name, "status": "Open"},
		["name", "cost_center"],
		as_dict=True,
	)

	if project:
		return project.name, project.cost_center

	return None, None
