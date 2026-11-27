// Copyright (c) 2026, Team ERP and Contributors
// For license information, please see license.txt

// Suppress cost-center update message for Sales Invoice only
(function () {
	const original_msgprint = frappe.msgprint;
	frappe.msgprint = function (msg, ...args) {
		let text = typeof msg === "string" ? msg : (msg && msg.message) || "";
		if (
			cur_frm &&
			cur_frm.doc.doctype === "Sales Invoice" &&
			text.includes("Cost Center for Item rows has been updated")
		) {
			return;
		}
		return original_msgprint.call(this, msg, ...args);
	};
})();

frappe.ui.form.on("Sales Invoice", {
	refresh(frm) {
		hide_add_multiple_button(frm);
	},
});

function hide_add_multiple_button(frm) {
	if (frm._add_multiple_hidden) return;
	frm._add_multiple_hidden = true;

	$(frm.wrapper).addClass("pi-hide-add-multiple");

	if ($("#pi-hide-add-multiple-style").length) return;

	$("<style id='pi-hide-add-multiple-style'>")
		.text(".pi-hide-add-multiple .grid-add-multiple-rows { display: none !important; }")
		.appendTo("head");
}
