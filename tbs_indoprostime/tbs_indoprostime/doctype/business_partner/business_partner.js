// Copyright (c) 2026, Team ERP and contributors
// For license information, please see license.txt

frappe.ui.form.on("Business Partner", {
	refresh(frm) {
		setTimeout(() => {
			const dashboard = frm.dashboard?.wrapper || $('.form-dashboard').first();
			const column = $('[data-fieldname="column_connection"]');
			const tabLink = $('.form-tabs .nav-link').filter(function () {
				return $(this).text().trim() === 'Connections';
			});

			const hasPerm = (frm.perm || []).some(p => p.permlevel >= 1 && p.read);

			if (!hasPerm) {
				dashboard.hide();
				tabLink.closest('li').hide();

				if (tabLink.hasClass('active')) {
					$('.form-tabs .nav-link').filter(function () {
						return $(this).text().trim() === 'Details';
					}).tab('show');
				}
				return;
			}

			tabLink.closest('li').show();
			if (column.length) {
				column.append(dashboard);
			}
		}, 200);
	},
});
