# Copyright (c) 2026, Team ERP and contributors
# For license information, please see license.txt

from frappe.model.document import Document


class SeaImportFreightSettings(Document):
	def validate(self):
		if self.customer and self.origin:
			self.customer_origin = f"{self.customer}-{self.origin}"
		else:
			self.customer_origin = ""
