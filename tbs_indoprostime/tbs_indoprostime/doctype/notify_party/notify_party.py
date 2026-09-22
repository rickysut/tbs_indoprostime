# tbs_indoprostime/tbs_indoprostime/doctype/notify_party/notify_party.py
import frappe
from frappe.model.document import Document

class NotifyParty(Document):
    def validate(self):
        if self.port and self.country:
            port_country = frappe.db.get_value('Port', self.port, 'country')
            if port_country != self.country:
                frappe.throw(f"Port {self.port} tidak sesuai dengan Country {self.country}")


@frappe.whitelist()
def get_countries_with_port(doctype, txt, searchfield, start, page_len, filters):
    return frappe.db.sql("""
        SELECT DISTINCT country, country
        FROM `tabPort`
        WHERE country LIKE %(txt)s
        ORDER BY country
        LIMIT %(start)s, %(page_len)s
    """, {
        'txt': f'%{txt}%',
        'start': start,
        'page_len': page_len
    })