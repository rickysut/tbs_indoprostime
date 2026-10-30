// Copyright (c) 2026, Team ERP and Contributors
// For license information, please see license.txt

// Suppress cost-center update message for Sales Order only
(function () {
	const original_msgprint = frappe.msgprint;
	frappe.msgprint = function (msg, ...args) {
		let text = typeof msg === "string" ? msg : (msg && msg.message) || "";
		if (
			cur_frm &&
			cur_frm.doc.doctype === "Sales Order" &&
			text.includes("Cost Center for Item rows has been updated")
		) {
			return;
		}
		return original_msgprint.call(this, msg, ...args);
	};
})();

// Override Sales Order form events
frappe.ui.form.on("Sales Order", {
	setup(frm) {
		if (frappe.ui.form.Form.prototype.__so_dup_patched) return;
		frappe.ui.form.Form.prototype.__so_dup_patched = true;

		const orig = frappe.ui.form.Form.prototype.copy_doc;
		frappe.ui.form.Form.prototype.copy_doc = function (onload, from_amend) {
			const src = this.doc.name;
			const dt = this.doctype;
			return orig.call(this, (newdoc) => {
				if (dt === "Sales Order" && !from_amend) {
					newdoc.custom_duplicate_from = src;
					newdoc.po_no = "";
				}
				if (onload) onload(newdoc);
			}, from_amend);
		};
	},
	refresh(frm) {
		setTimeout(() => {
			frm.set_query("item_code", "items", function (doc, cdt, cdn) {
				let filters = {};

				if (frm.doc.custom_valas) {
					filters["custom_valas"] = frm.doc.custom_valas;
					filters["disabled"] = 0;
					filters["is_sales_item"] = 1;
				}

				if (frm.doc.custom_division) {
					filters["custom_division"] = frm.doc.custom_division;
				}

				return {
					filters: filters,
				};
			});

			const tabLink = $('.form-tabs .nav-link').filter(function () {
				return $(this).text().trim() === 'Connections';
			});

			tabLink.closest('li').hide();

			if (tabLink.hasClass('active')) {
				$('.form-tabs .nav-link').filter(function () {
					return $(this).text().trim() === 'Details';
				}).tab('show');
			}
		}, 200);

		setTimeout(() => {
			frm.remove_custom_button(__("Pick List"), __("Create"));
			frm.remove_custom_button(__("Material Request"), __("Create"));
			frm.remove_custom_button(__("Request for Raw Materials"), __("Create"));
			frm.remove_custom_button(__("Vendor Order"), __("Create"));
			frm.remove_custom_button(__("Project"), __("Create"));
			frm.remove_custom_button(__("Vendor Invoice"), __("Create"));

			if (frm.doc.workflow_state === "To Bill") {
				frm.add_custom_button(__("Vendor Invoice"), function () {
					make_vendor_invoice(frm);
				}, __("Create"));
			}

			// Coba hapus dengan beberapa varian label group yang umum di Frappe/ERPNext
			frm.remove_custom_button(__('Quotation'), __('Get Items From'));
			frm.remove_custom_button(__('Quotation'), __('Get items from'));
			frm.remove_custom_button(__('Quotation'), __('Get Items from'));
		}, 1200);

		if (frm.is_new()) {
			frm.add_custom_button(__("Duplicate From"), () => {
				if (!frm.doc.custom_division) {
					frappe.msgprint({
						title: __("Warning"),
						indicator: "orange",
						message: __("Pilih Division terlebih dahulu sebelum Duplicate From."),
					});
					return;
				}

				const d = new frappe.ui.Dialog({
					title: __("Duplicate From Customer Order"),
					fields: [
						{
							fieldname: "source_so",
							fieldtype: "Link",
							label: __("Sales Order"),
							options: "Sales Order",
							reqd: 1,
							get_query: () => ({
								filters: { custom_division: frm.doc.custom_division },
							}),
						},
					],
					primary_action_label: __("Duplicate"),
					primary_action({ source_so }) {
						d.hide();
						frappe.model.with_doc("Sales Order", source_so, () => {
							const src = frappe.model.get_doc("Sales Order", source_so);
						const copy = frappe.model.copy_doc(src);
							copy.custom_doc_copy = frm.doctype;
							copy.custom_copy_from = source_so;
							copy.custom_air_clearance_no = "";
							copy.custom_sea_clearance_no = "";
							copy.po_no = "";
							frappe.set_route("Form", "Sales Order", copy.name);
						});
					},
				});
				d.show();
			}, __("Duplicate"));
		}
		else
		{
			if (frm.doc.custom_division === "AI" && !frm.doc.custom_air_clearance_no) {
				frm.add_custom_button(__("Generate Air Clearance"), () => {
					frappe.confirm(__("Create Air Clearance Document?"), () => {
						const copy = frappe.model.copy_doc(frm.doc);
						copy.custom_division = "AC";
						copy.custom_doc_copy = "";
						copy.custom_copy_from = "";
						copy.po_no = "";
						copy.custom_air_import_no = frm.doc.name;
						copy.custom_air_clearance_no = "";

						const ac_doc = typeof copy.as_dict === "function" ? copy.as_dict() : { ...copy };
						delete ac_doc.name;
						delete ac_doc.owner;
						delete ac_doc.creation;
						delete ac_doc.modified;
						delete ac_doc.modified_by;
						delete ac_doc.docstatus;
						delete ac_doc.idx;
						delete ac_doc.__islocal;
						delete ac_doc.__unsaved;

						frappe.db.insert(ac_doc)
							.then((saved) => {
								frappe.call({
									method: "frappe.client.set_value",
									args: {
										doctype: "Sales Order",
										name: frm.doc.name,
										fieldname: "custom_air_clearance_no",
										value: saved.name,
									},
									callback(r) {
										if (!r.exc && r.message) {
											frm.reload_doc();
											frappe.show_alert({
												message: __("Air Clearance {0} dibuat dan ditautkan ke {1}", [saved.name, frm.doc.name]),
												indicator: "green",
											});
										}
									},
								});
							})
							.catch((err) => {
								frappe.msgprint(err.message || __("Gagal membuat Air Clearance."));
							});
					});
				}, __("Generate"));
			} else if (frm.doc.custom_division === "SI" && !frm.doc.custom_sea_clearance_no) {
				frm.add_custom_button(__("Generate Sea Clearance"), () => {
					frappe.confirm(__("Create Sea Clearance Document?"), () => {
						const copy = frappe.model.copy_doc(frm.doc);
						copy.custom_division = "SC";
						copy.custom_doc_copy = "";
						copy.custom_copy_from = "";
						copy.po_no = "";
						copy.custom_sea_import_no = frm.doc.name;
						copy.custom_sea_clearance_no = "";

						const sc_doc = typeof copy.as_dict === "function" ? copy.as_dict() : { ...copy };
						delete sc_doc.name;
						delete sc_doc.owner;
						delete sc_doc.creation;
						delete sc_doc.modified;
						delete sc_doc.modified_by;
						delete sc_doc.docstatus;
						delete sc_doc.idx;
						delete sc_doc.__islocal;
						delete sc_doc.__unsaved;

						frappe.db.insert(sc_doc)
							.then((saved) => {
								frappe.call({
									method: "frappe.client.set_value",
									args: {
										doctype: "Sales Order",
										name: frm.doc.name,
										fieldname: "custom_sea_clearance_no",
										value: saved.name,
									},
									callback(r) {
										if (!r.exc && r.message) {
											frm.reload_doc();
											frappe.show_alert({
												message: __("Sea Clearance {0} dibuat dan ditautkan ke {1}", [saved.name, frm.doc.name]),
												indicator: "green",
											});
										}
									},
								});
							})
							.catch((err) => {
								frappe.msgprint(err.message || __("Gagal membuat Sea Clearance."));
							});
					});
				}, __("Generate"));
			}
		}

		$(frm.fields_dict.custom_surender.wrapper)
            .find('.checkbox')
            .css('margin-top', '0');
			
		frm.set_df_property(
			"custom_bc_23",
			"label",
			(frm.doc.custom_division === "AC" || frm.doc.custom_division === "SC")  ? "BC 2.3/PIB" : "BC 2.3"
		);

		frm.set_df_property(
			"custom_origin",
			"label",
			frm.doc.custom_division === "SE" ? "Loading Port" : "Origin"
		);

		let fields_to_align = [
			"custom_division",
			"custom_branch",
			"po_no",
			"po_date",
			"customer",
			"customer_name",
			"transaction_date",
			"custom_sales",
			"custom_exporter__shipper",
			"custom_importer__consignee",
			"custom_notify_party",
			"custom_overseas_agent",
			"custom_mawb",
			"custom_hawb",
			"custom_etd",
			"custom_eta",
			"custom_origin",
			"custom_destination",
			"custom_remark",
			"custom_issued",
			"custom_date2con",
			"custom_gross_weight",
			"custom_chgbl_weight",
			"custom_valas",
			"custom_kurs",
			"custom_freight",
			"custom_cost__kg",
			"custom_packing_listed",
			"custom_declared",
			"custom_insurance",
			"custom_carrier",
			"custom_carrier2",
			"custom_carrier3",
			"custom_other",
			"custom_other2",
			"custom_other3",
			"custom_agent_charge",
			"custom_carrier_charge",
			"custom_voided",
			"custom_posted",
			// AI
			"custom_flight_ai",
			
			"custom_bc_invoice",
			"custom_name",
			"custom_goods",
			"custom_air_clearance_no",
			"custom_doc_copy",
			"custom_copy_from",
			// AC
			"custom_air_import_no",
			// SE
			"custom_shipping_line",
			"custom_pbm",
			"custom_mbl",
			"custom_hbl",
			"custom_master_console",
			"custom_net_weight",
			"custom_ctnr__seal",
			"custom_dp_container",
			"custom_feeder_ves_",
			"custom_mother_ves",
			"custom_receipt",
			"custom_discharge",
			"custom_delivery",
			"custom_type_service",
			"custom_no_packages",
			"custom_measurement",
			"custom_say_no_cont",
			"custom_payable_at",
			"custom_no_orig_bl",
			"custom_board_date",
			// SI
			"custom_closed",
			"custom_factory",
			"custom_area",
			"custom_recv_by",
			"custom_sea_clearance_no",
			"custom_disbursmn",
			"custom_rev__ton",
			"custom_prepaid",
			"custom_collect",
			"custom_qty",
			//SC
			"custom_sea_import_no"

		];

		if (frm.doc.custom_division === "SE" || frm.doc.custom_division === "SI" || frm.doc.custom_division === "SC") {
			fields_to_align.push("custom_delivered");
		}
		setTimeout(() => {
			apply_horizontal_alignment(frm, fields_to_align);

			arrange_quantity_fields(frm);

			apply_horizontal_group(frm, [
				{ fieldname: "custom_trucking_no", width: 50 },
				{ fieldname: "custom_trucking2", width: 50, no_label: true }
			]);

			apply_horizontal_group(frm, [
				{ fieldname:"custom_bc_23", width: 50 },
				{ fieldname: "custom_pib", width: 50, no_label: true }
			]);

			

			apply_horizontal_group(frm, [
				{ fieldname: "custom_to", width: 33.3 },
				{ fieldname: "custom_to2", width: 33.3, no_label: true },
				{ fieldname: "custom_to3", width: 33.3, no_label: true }
			]);

			// AI
			apply_horizontal_group(frm, [
				{ fieldname: "custom_whkbpc", width: 50 },
				{ fieldname: "custom_wh_kbpc_2", width: 50, no_label: true }
			]);

			// Fungsi ini tidak ada di file ini; di-guard supaya tidak ReferenceError
			// if (typeof arrange_delivered_width === "function") {
			// 	arrange_delivered_width(frm);
			// }

			apply_horizontal_group(frm, [
				{ fieldname: "custom_air_freight__other_charge", width: 50 },
				{ fieldname: "custom_air_freight__other_charge_2", width: 50, no_label: true }
			]);

			apply_horizontal_group(frm, [
				{ fieldname: "custom_other_cost_notevalue", width: 50 },
				{ fieldname: "custom_other_cost_2", width: 50, no_label: true }
			]);

			apply_horizontal_group(frm, [
				{ fieldname: "custom_collection_agency_fee", width: 50 },
				{ fieldname: "custom_collection_agency_fee_2", width: 50, no_label: true }
			]);

			["custom_collection_agency_fee", "custom_collection_agency_fee_2"].forEach((fn) => {
				add_percent_suffix(frm, fn);
			});

			apply_horizontal_group(frm, [
				{ fieldname: "custom_to_trucking_no", width: 50 },
				{ fieldname: "custom_to_trucking_no_2", width: 50, no_label: true }
			]);

			apply_horizontal_group(frm, [
				{ fieldname: "custom_fcl_40_ft20_ft", width: 50 },
				{ fieldname: "custom_fcl_40_ft20_ft_2", width: 50, no_label: true }
			]);

			apply_horizontal_group(frm, [
				{ fieldname: "custom_fcllcl_vol", width: 50 },
				{ fieldname: "custom_fcllcl_vol_2", width: 50, no_label: true }
			]);

			apply_horizontal_group(frm, [
				{ fieldname: "custom_gr_wgt_12", width: 50 },
				{ fieldname: "custom_gr_wgt_12_2", width: 50, no_label: true }
			]);

			
			
			
			fix_delivered_full(frm);
			arrange_valas_fields(frm);
			arrange_issued_fields(frm);
			arrange_notes_fields(frm);
			arrange_freight_fields(frm);
		}, 700);

		frm.set_query("custom_exporter__shipper", function () {
			return {
				query: "tbs_indoprostime.tbs_indoprostime.overrides.sales_order.exporter_shipper_query",
			};
		});

		frm.set_query("custom_importer__consignee", function () {
			return {
				query: "tbs_indoprostime.tbs_indoprostime.overrides.sales_order.importer_consignee_query",
			};
		});
	},

	transaction_date(frm) {
		if (frm.doc.custom_valas) {
			frm.trigger("custom_valas");
		}
	},

	customer(frm) {
		if (!frm.doc.customer) {
			frm.set_value("custom_sales", "");
			return;
		}
		frappe.db.get_doc("Customer", frm.doc.customer).then((customer_doc) => {
			let sales_team = customer_doc.sales_team || customer_doc.sales_teams || [];
			if (sales_team.length) {
				frm.set_value("custom_sales", sales_team[0].sales_person);
			} else {
				frm.set_value("custom_sales", "");
			}
		});
	},

	custom_division(frm) {
		setTimeout(() => fix_delivered_full(frm), 300);
		arrange_valas_fields(frm);
		arrange_issued_fields(frm);
		arrange_notes_fields(frm);
		arrange_freight_fields(frm);
		setTimeout(() => arrange_quantity_fields(frm), 300);

		frm.set_df_property(
			"custom_bc_23",
			"label",
			(frm.doc.custom_division === "AC" || frm.doc.custom_division === "SC")  ? "BC 2.3/PIB" : "BC 2.3"
		);

		frm.set_df_property(
			"custom_origin",
			"label",
			frm.doc.custom_division === "SE" ? "Loading Port" : "Origin"
		);

		if (!frm.doc.custom_division) {
			frm.set_value("project", "");
			frm.set_value("cost_center", "");
			return;
		}

		frappe.call({
			method: "tbs_indoprostime.tbs_indoprostime.overrides.sales_order.get_project_and_cost_center",
			args: { division: frm.doc.custom_division },
			callback(r) {
				if (r.message && r.message.project) {
					frm.set_value("project", r.message.project);
					frm.set_value("cost_center", r.message.cost_center);
				}
			},
		});
	},

	custom_valas(frm) {
		// isi kurs terhadap IDR
		if (!frm.doc.custom_valas) {
			frm.set_value("custom_kurs", 0);
		} else if (frm.doc.custom_valas === "IDR") {
			frm.set_value("custom_kurs", 1);
		} else {
			frappe.call({
				method: "erpnext.setup.utils.get_exchange_rate",
				args: {
					from_currency: frm.doc.custom_valas,
					to_currency: "IDR",
					transaction_date: frm.doc.transaction_date || frappe.datetime.get_today(),
				},
				callback(r) {
					if (r.message) {
						frm.set_value("custom_kurs", flt(r.message));
					} else {
						frappe.show_alert({
							message: __("Kurs {0} ke IDR tidak ditemukan", [frm.doc.custom_valas]),
							indicator: "orange",
						});
					}
				},
			});
		}

		setTimeout(() => {
			frm.set_query("item_code", "items", function (doc, cdt, cdn) {
				let filters = {};

				if (frm.doc.custom_valas) {
					filters["custom_valas"] = frm.doc.custom_valas;
					filters["disabled"] = 0;
					filters["is_sales_item"] = 1;
				}

				if (frm.doc.custom_division) {
					filters["custom_division"] = frm.doc.custom_division;
				}

				return {
					filters: filters,
				};
			});
		}, 200);
	},
});

frappe.ui.form.on("Sales Order Item", {
	custom_cost(frm, cdt, cdn) {
		calculate_total_cost(frm, cdt, cdn);
	},
	qty(frm, cdt, cdn) {
		calculate_total_cost(frm, cdt, cdn);
	}
});

function calculate_total_cost(frm, cdt, cdn) {
	let row = locals[cdt][cdn];
	if (row.custom_cost && row.qty) {
		let total = flt(row.custom_cost) * flt(row.qty);
		frappe.model.set_value(cdt, cdn, "custom_total_cost", total);
	}
}

function make_vendor_invoice(frm) {
	frappe.model.with_doctype("Purchase Invoice", () => {
		let pi = frappe.model.get_new_doc("Purchase Invoice");
		pi.company = frm.doc.company;
		pi.cost_center = frm.doc.cost_center;
		pi.project = frm.doc.project;

		frm.doc.items.forEach((row) => {
			let pi_item = frappe.model.add_child(pi, "Purchase Invoice Item", "items");
			pi_item.item_code = row.item_code;
			pi_item.item_name = row.item_name;
			pi_item.description = row.description;
			pi_item.qty = row.qty;
			pi_item.uom = row.uom;
			pi_item.sales_order = frm.doc.name;
		});

		frappe.set_route("Form", "Purchase Invoice", pi.name);
	});
}

// Pastikan Delivered full width saat Division = SE (juga setelah pindah dari division lain)
function fix_delivered_full(frm) {
	const f = frm.get_field("custom_delivered");
	const r = frm.get_field("custom_released");
	if (!f) return;

	// simpan posisi asli released sekali saja
	if (r && !frm._released_orig) {
		frm._released_orig = { parent: r.$wrapper.parent(), prev: r.$wrapper.prev() };
	}

	// reset sisa style group/width dari division lain
	[f, r].forEach((x) => {
		if (!x) return;
		x.$wrapper.css({ float: "none", width: "100%", "margin-left": "0px" });
		x.$wrapper.next(".tbs-group-clearfix").remove();
	});

	const div = frm.doc.custom_division;

	if (div === "SE" || div === "SI" ) {
		// Delivered full width
		apply_horizontal_alignment(frm, ["custom_delivered"]);
		f.$wrapper.find(".control-input-wrapper, .control-input, input, select").each(function () {
			this.style.setProperty("width", "100%", "important");
			this.style.setProperty("max-width", "100%", "important");
		});
	} else if ((div === "AI" || div === "AC") && r) {
		// Delivered 50 : Released 50, dalam satu baris
		f.$wrapper.after(r.$wrapper);
		apply_horizontal_group(frm, [
			{ fieldname: "custom_delivered", width: 50 },
			{ fieldname: "custom_released", width: 50, label_width: 58 }
		]);
	} else if (r && frm._released_orig) {
		// division lain: kembalikan Released ke posisi asli
		const o = frm._released_orig;
		if (o.prev.length) {
			o.prev.after(r.$wrapper);
		} else {
			o.parent.prepend(r.$wrapper);
		}
	}
}

// custom_goods_information
// custom_marks__numbers
// custom_ctnr__seal_no_note
function arrange_notes_fields(frm) {
	const fieldnames = ["custom_goods_information", "custom_marks__numbers", "custom_ctnr__seal_no_note"];
	const anchor = frm.get_field("custom_gr_wgt_12_2");
	if (!anchor) return;

	// simpan posisi asli sekali saja
	if (!frm._notes_orig) {
		frm._notes_orig = fieldnames.map((fn) => {
			const w = frm.get_field(fn).$wrapper;
			return { fn: fn, parent: w.parent(), prev: w.prev() };
		});
	}

	if (frm.doc.custom_division === "SC") {
		// tempatkan notes setelah clearfix grup gr_wgt, bukan langsung setelah anchor,
		// supaya tidak menimpa field floating custom_gr_wgt_12 / custom_gr_wgt_12_2
		let clearfix = anchor.$wrapper.next(".tbs-group-clearfix");
		let last = clearfix.length ? clearfix : anchor.$wrapper;
		fieldnames.forEach((fn) => {
			const w = frm.get_field(fn).$wrapper;
			last.after(w);
			last = w;
		});
	} else {
		frm._notes_orig.forEach((o) => {
			const w = frm.get_field(o.fn).$wrapper;
			if (o.prev.length) {
				o.prev.after(w);
			} else {
				o.parent.prepend(w);
			}
		});
	}
}


function arrange_valas_fields(frm) {
	const fieldnames = ["custom_valas", "custom_kurs", "custom_freight"];
	const anchor = frm.get_field("custom_chgbl_weight");
	if (!anchor) return;

	// simpan posisi asli sekali saja
	if (!frm._valas_orig) {
		frm._valas_orig = fieldnames.map((fn) => {
			const w = frm.get_field(fn).$wrapper;
			return { fn: fn, parent: w.parent(), prev: w.prev() };
		});
	}

	if (frm.doc.custom_division === "AI") {
		let last = anchor.$wrapper;
		fieldnames.forEach((fn) => {
			const w = frm.get_field(fn).$wrapper;
			last.after(w);
			last = w;
		});
	} else {
		frm._valas_orig.forEach((o) => {
			const w = frm.get_field(o.fn).$wrapper;
			if (o.prev.length) {
				o.prev.after(w);
			} else {
				o.parent.prepend(w);
			}
		});
	}
}

function arrange_quantity_fields(frm) {
	const q = frm.get_field("custom_quantity");
	const u = frm.get_field("custom_unit");
	const o = frm.get_field("custom_origin");
	if (!q || !u) return;

	// simpan posisi asli sekali saja
	if (!frm._qty_orig) {
		frm._qty_orig = [q, u].map((x) => ({
			w: x.$wrapper,
			parent: x.$wrapper.parent(),
			prev: x.$wrapper.prev(),
		}));
	}

	// hapus clearfix lama sebelum field dipindah
	u.$wrapper.next(".tbs-group-clearfix").remove();

	if (frm.doc.custom_division === "SE" && o) {
		// taruh di atas Origin, 60:40
		o.$wrapper.before(q.$wrapper);
		q.$wrapper.after(u.$wrapper);
		apply_horizontal_group(frm, [
			{ fieldname: "custom_quantity", width: 60 },
			{ fieldname: "custom_unit", width: 40, no_label: true }
		]);
	} else {
		// kembalikan ke posisi asli, 60:40
		frm._qty_orig.forEach((p) => {
			if (p.prev.length) {
				p.prev.after(p.w);
			} else {
				p.parent.prepend(p.w);
			}
		});
		apply_horizontal_group(frm, [
			{ fieldname: "custom_quantity", width: 60 },
			{ fieldname: "custom_unit", width: 40, no_label: true }
		]);
	}
}

function arrange_issued_fields(frm) {
	const fieldnames = ["custom_issued", "custom_delivered"];
	const anchor = frm.get_field("custom_eta");
	if (!anchor) return;

	// simpan posisi asli sekali saja
	if (!frm._issued_orig) {
		frm._issued_orig = fieldnames.map((fn) => {
			const w = frm.get_field(fn).$wrapper;
			return { fn: fn, parent: w.parent(), prev: w.prev() };
		});
	}

	if (frm.doc.custom_division === "SE") {
		let last = anchor.$wrapper;
		fieldnames.forEach((fn) => {
			const w = frm.get_field(fn).$wrapper;
			last.after(w);
			last = w;
		});
	} else {
		frm._issued_orig.forEach((o) => {
			const w = frm.get_field(o.fn).$wrapper;
			if (o.prev.length) {
				o.prev.after(w);
			} else {
				o.parent.prepend(w);
			}
		});
	}
}

function arrange_freight_fields(frm) {
	const fieldnames = ["custom_freight"];
	const anchor = frm.get_field("custom_closed");
	if (!anchor) return;

	// simpan posisi asli sekali saja
	if (!frm._freight_orig) {
		frm._freight_orig = fieldnames.map((fn) => {
			const w = frm.get_field(fn).$wrapper;
			return { fn: fn, parent: w.parent(), prev: w.prev() };
		});
	}

	if (frm.doc.custom_division === "SI") {
		let last = anchor.$wrapper;
		fieldnames.forEach((fn) => {
			const w = frm.get_field(fn).$wrapper;
			last.after(w);
			last = w;
		});
	} else {
		frm._freight_orig.forEach((o) => {
			const w = frm.get_field(o.fn).$wrapper;
			if (o.prev.length) {
				o.prev.after(w);
			} else {
				o.parent.prepend(w);
			}
		});
	}
}

function apply_horizontal_alignment(frm, fields_to_align) {
	fields_to_align.forEach((field_name) => {
		let f = frm.get_field(field_name);
		if (f) {
			f.$wrapper.find(".form-group").attr("style", function (i, s) {
				return (
					(s || "") +
					"display: flex !important; flex-direction: row !important; align-items: center !important; gap: 10px !important; margin-bottom: 2px !important; margin-top: 0px !important; padding-top: 0px !important;"
				);
			});

			f.$wrapper.find(".control-label").attr("style", function (i, s) {
				let ret =
					"flex: 0 0 140px !important; min-width: 140px !important; margin-bottom: 12px !important; text-align: left !important; font-weight: normal !important;";

				return (s || "") + ret;
			});

			f.$wrapper.find(".control-input-wrapper").css({
				flex: "1",
				width: "100%",
				"margin-top": "0px",
			});

			let is_numeric = ["Currency", "Float", "Int", "Percent"].includes(f.df.fieldtype);
			let alignment = is_numeric ? "right" : "left";

			f.$wrapper
				.find("input, select, .input-with-feedback, .control-value")
				.attr("style", function (i, s) {
					let style_extra = `width: 100% !important; max-width: 100% !important; height: 28px !important; min-height: 28px !important; text-align: ${alignment} !important;`;

					return (s || "") + style_extra;
				});

			if (is_numeric) {
				f.$wrapper.find("input").css("padding-right", "10px");
			}
			f.$wrapper.find(".control-input, .control-value").css({
				"min-height": "28px",
				height: "auto",
				width: "100%",
			});

			f.$wrapper.find("input, select, .input-with-feedback").attr("style", function (i, s) {
				let sel =
					"width: 100% !important; max-width: 100% !important; height: 28px !important; min-height: 28px !important;";
				return (s || "") + sel;
			});

			if (f.$wrapper.find(".control-input:visible").length > 0) {
				f.$wrapper.find(".control-value").hide();
			}
		}
	});
}

function add_percent_suffix(frm, fieldname) {
	let f = frm.get_field(fieldname);
	if (!f) return;

	// Ganti CSS versi lama
	$("#percent-suffix-style, #percent-suffix-style-v2").remove();
	if (!document.getElementById("percent-suffix-style-v3")) {
		$("<style id='percent-suffix-style-v3'>")
			.text(`
				.has-percent-suffix-wrap { display: flex !important; align-items: stretch !important; position: relative; min-width: 0; }
				.has-percent-suffix {
					flex: 1 1 auto !important;
					min-width: 0 !important;
					padding-right: 10px !important;
					position: relative;
					z-index: 1;
					border-radius: 8px !important;
				}
				.percent-suffix {
					flex: 0 0 52px;
					width: 52px;
					height: 28px;
					margin-left: -14px;
					padding-left: 14px;
					display: flex;
					align-items: center;
					justify-content: center;
					background: var(--gray-200, #e9ecef);
					color: var(--text-muted, #6c757d);
					border-radius: 8px;
					font-size: 12px;
					font-weight: 600;
					pointer-events: none;
					box-sizing: border-box;
					position: relative;
					z-index: 0;
				}
			`)
			.appendTo("head");
	}

	let $input = f.$input && f.$input.length ? f.$input : f.$wrapper.find("input").first();
	if (!$input.length) return;

	$input.addClass("has-percent-suffix");
	$input.parent().addClass("has-percent-suffix-wrap");

	// Hapus badge lama supaya tidak duplikat
	$input.siblings(".percent-suffix").remove();

	$('<span class="percent-suffix">%</span>').insertAfter($input);
}

function apply_horizontal_group(frm, group) {
	if (!group || group.length === 0) return;

	// hitung label_px & gap_px per item
	let items = group.map((item, index) => {
		let is_first = index === 0;
		let has_label = !item.no_label;
		return {
			...item,
			is_first,
			has_label,
			label_px: has_label ? (item.label_width || 140) : 0,
			gap_px: is_first ? 0 : (has_label ? 2 : 1), // jarak antar box
			tight: !is_first && !has_label, // trik -6px hanya untuk field tanpa label
		};
	});

	let total_label_width = items.reduce((s, i) => s + i.label_px, 0);
	let total_gap = items.reduce((s, i) => s + i.gap_px, 0);

	items.forEach((item) => {
		let f = frm.get_field(item.fieldname);
		if (!f) return;

		let width = item.width || Math.floor(100 / items.length);
		let margin_left = item.tight ? "-6px" : "0px";
		let extra_px = item.tight ? 6 : 0;
		let padding_left = (!item.is_first && item.has_label) ? `${item.gap_px}px` : "0px";
		let inner_gap = (!item.is_first && item.has_label) ? 2 : 10; // label ke input
		let wrapper_width = `calc(${item.label_px}px + ${item.gap_px}px + (100% - ${total_label_width}px - ${total_gap}px) * ${width / 100})`;

		f.$wrapper.css({
			"display": "block",
			"float": "left",
			"width": wrapper_width,
			"box-sizing": "border-box",
			"margin-bottom": "2px",
			"margin-top": "0px",
			"padding-top": "0px",
		});

		f.$wrapper.find(".form-group").attr("style", function (i, s) {
			return (
				(s || "") +
				`display: flex !important; flex-direction: row !important; align-items: center !important; gap: ${inner_gap}px !important; width: calc(100% + ${extra_px}px) !important; box-sizing: border-box !important; margin-left: ${margin_left} !important; padding-left: ${padding_left} !important; padding-right: 0px !important; margin-bottom: 0px !important; margin-top: 0px !important; padding-top: 0px !important;`
			);
		});

		if (item.no_label) {
			f.$wrapper.find(".control-label").attr("style", function (i, s) {
				return (s || "") + "display: none !important; flex: 0 0 0 !important; min-width: 0 !important; width: 0 !important; margin: 0 !important; padding: 0 !important;";
			});
			f.$wrapper.find(".control-input-wrapper").css({
				flex: "1",
				width: "100%",
				"margin-top": "0px",
			});
		} else {
			f.$wrapper.find(".control-label").attr("style", function (i, s) {
				return (
					(s || "") +
					`flex: 0 0 ${item.label_px}px !important; min-width: ${item.label_px}px !important; margin-top: 0px !important; margin-bottom: 12px !important; text-align: left !important; font-weight: normal !important;`
				);
			});
			f.$wrapper.find(".control-input-wrapper").css({
				flex: "1",
				width: "100%",
				"margin-top": "0px",
			});
		}

		let is_numeric = ["Currency", "Float", "Int", "Percent"].includes(f.df.fieldtype);
		let alignment = is_numeric ? "right" : "left";

		f.$wrapper
			.find("input, select, .input-with-feedback, .control-value")
			.attr("style", function (i, s) {
				let style_extra = `width: 100% !important; max-width: 100% !important; height: 28px !important; min-height: 28px !important; text-align: ${alignment} !important;`;
				return (s || "") + style_extra;
			});

		if (is_numeric) {
			f.$wrapper.find("input").css("padding-right", "10px");
		}

		f.$wrapper.find(".control-input, .control-value").css({
			"min-height": "28px",
			height: "auto",
			width: "100%",
		});

		f.$wrapper.find("input, select, .input-with-feedback").attr("style", function (i, s) {
			let sel =
				"width: 100% !important; max-width: 100% !important; height: 28px !important; min-height: 28px !important;";
			return (s || "") + sel;
		});

		if (f.$wrapper.find(".control-input:visible").length > 0) {
			f.$wrapper.find(".control-value").hide();
		}

		setTimeout(() => {
			if (f.$wrapper.find(".control-input:visible").length > 0) {
				f.$wrapper.find(".control-value").hide();
			}
		}, 100);
	});

	let last = group[group.length - 1];
	let last_f = frm.get_field(last.fieldname);
	if (last_f) {
		// hapus hanya clearfix milik group ini, bukan milik group lain
		last_f.$wrapper.next(".tbs-group-clearfix").remove();
		last_f.$wrapper.after('<div class="tbs-group-clearfix" style="clear: both; display: block; width: 100%; height: 1px;"></div>');
	}
}