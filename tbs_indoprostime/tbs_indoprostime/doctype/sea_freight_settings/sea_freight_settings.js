// Copyright (c) 2026, Team ERP and contributors
// For license information, please see license.txt

frappe.ui.form.on("Sea Freight Settings", {
	refresh(frm) {
		let fields_to_align = [
			"customer",
			"admin_fee",
			"pib_edi_fee",
			"agency_fee",
			"clearance_fcl_20",
			"clearance_fcl_40",
			"clearance_min_cbm",
			"clearance_add_container",
			"clearance_greater_than",
			"clearance_min_cbm_price",
			"clearance_greater_price",
			"trucking_fcl_20",
			"trucking_fcl_40",
			"box_min_cbm",
			"box_greater_cbm",
			"fuso_min_cbm",
			"fuso_greater_cbm",
			"box_min_price",
			"box_greater_price",
			"fuso_min_price",
			"fuso_greater_price"
		];

		setTimeout(() => {
			apply_horizontal_alignment(frm, fields_to_align);

			add_input_suffix(frm, "clearance_fcl_20", "/Cont.");
			add_input_suffix(frm, "clearance_fcl_40", "/Cont.");
			add_input_suffix(frm, "clearance_add_container", "/Cont.");
			add_input_suffix(frm, "trucking_fcl_20", "/Cont.");
			add_input_suffix(frm, "trucking_fcl_40", "/Cont.");

			add_input_suffix(frm, "clearance_min_cbm", "Cbm");
			add_input_suffix(frm, "clearance_greater_than", "Cbm");

			add_input_suffix(frm, "box_min_cbm", "Cbm");
			add_input_suffix(frm, "box_greater_cbm", "Cbm");

			add_input_suffix(frm, "fuso_min_cbm", "Cbm");
			add_input_suffix(frm, "fuso_greater_cbm", "Cbm");

			add_input_prefix(frm, "admin_fee", "IDR");
			add_input_prefix(frm, "pib_edi_fee", "IDR");
			add_input_prefix(frm, "agency_fee", "IDR");
			add_input_prefix(frm, "clearance_min_cbm_price", "IDR");
			add_input_prefix(frm, "clearance_greater_price", "IDR");
			add_input_prefix(frm, "box_min_price", "IDR");
			add_input_prefix(frm, "box_greater_price", "IDR");
			add_input_prefix(frm, "fuso_min_price", "IDR");
			add_input_prefix(frm, "fuso_greater_price", "IDR");

			apply_horizontal_group(frm, [
				{ fieldname: "admin_item", width: 20 },
				{ fieldname: "admin_item_name", width: 80, no_label: true }
			]);

			apply_horizontal_group(frm, [
				{ fieldname: "pib_edi_item", width: 20 },
				{ fieldname: "pib_edi_item_name", width: 80, no_label: true }
			]);

			apply_horizontal_group(frm, [
				{ fieldname: "agency_item", width: 20 },
				{ fieldname: "agency_item_name", width: 80, no_label: true }
			]);

			apply_horizontal_group(frm, [
				{ fieldname: "clearance_item", width: 20 },
				{ fieldname: "clearance_item_name", width: 80, no_label: true }
			]);

			apply_horizontal_group(frm, [
				{ fieldname: "trucking_item", width: 20 },
				{ fieldname: "trucking_item_name", width: 80, no_label: true }
			]);

		}, 1000);
	},
});


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

function add_input_affix(frm, fieldname, text, position) {
	let f = frm.get_field(fieldname);
	if (!f) return;

	// selalu pasang ulang style supaya perubahan CSS langsung terpakai
	$("#input-affix-style").remove();
	$("<style id='input-affix-style'>")
		.text(`
			.input-affix-wrap { display: flex !important; align-items: stretch !important; min-width: 0; }
			input.form-control.has-input-affix {
				flex: 1 1 auto !important;
				min-width: 0 !important;
				border-radius: 8px !important;
			}
			input.form-control.has-input-affix.has-input-prefix {
				border-radius: 0 8px 8px 0 !important;
			}
			input.form-control.has-input-affix.has-input-suffix {
				border-radius: 8px 0 0 8px !important;
			}
			.input-affix-badge {
				flex: 0 0 auto;
				display: flex;
				align-items: center;
				justify-content: center;
				text-align: center;
				min-width: 50px;
				padding: 0 12px;
				background: var(--gray-200, #e9ecef);
				color: var(--text-muted, #6c757d);
				font-size: 12px;
				font-weight: 600;
				pointer-events: none;
				box-sizing: border-box;
			}
			.input-affix-badge.prefix { border-radius: 8px 0 0 8px; }
			.input-affix-badge.suffix { border-radius: 0 8px 8px 0; }
		`)
		.appendTo("head");

	let $input = f.$input && f.$input.length ? f.$input : f.$wrapper.find("input").first();
	if (!$input.length) return;

	let is_prefix = position === "prefix";
	let cls = is_prefix ? "prefix" : "suffix";

	$input.removeClass("has-input-prefix has-input-suffix").addClass(`has-input-affix has-input-${cls}`);
	$input[0].style.setProperty(
		"border-radius",
		is_prefix ? "0 8px 8px 0" : "8px 0 0 8px",
		"important"
	);
	$input.parent().addClass("input-affix-wrap");

	// Hapus badge lama supaya tidak duplikat
	$input.siblings(".input-affix-badge").remove();

	if (text) {
		let $badge = $(`<span class="input-affix-badge ${cls}">${text}</span>`);
		if (is_prefix) {
			$badge.insertBefore($input);
		} else {
			$badge.insertAfter($input);
		}
	}
}

function add_input_prefix(frm, fieldname, prefix) {
	add_input_affix(frm, fieldname, prefix, "prefix");
}

function add_input_suffix(frm, fieldname, suffix) {
	add_input_affix(frm, fieldname, suffix, "suffix");
}