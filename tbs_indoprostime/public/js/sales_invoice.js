// Copyright (c) 2026, Team ERP and Contributors
// For license information, please see license.txt

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
