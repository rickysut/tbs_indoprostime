frappe.provide("tbs_indoprostime.print_tracker");

(function () {
    "use strict";

    function get_print_info() {
        const path = window.location.pathname;
        const search = window.location.search;

        let match = path.match(/\/app\/print\/([^\/]+)\/([^\/]+)/);
        if (match) {
            return {
                doctype: decodeURIComponent(match[1]),
                name: decodeURIComponent(match[2]),
            };
        }

        if (path.includes("/printview")) {
            const params = new URLSearchParams(search);
            const doctype = params.get("doctype");
            const name = params.get("name");
            if (doctype && name) {
                return { doctype, name };
            }
        }

        return null;
    }

    function log_print(print_format) {
        const info = get_print_info();
        if (!info) return;

        clearTimeout(window._tbs_print_log_debounce);
        window._tbs_print_log_debounce = setTimeout(() => {
            frappe.call({
                method: "tbs_indoprostime.utils.print_log.log_print_activity",
                args: {
                    doctype: info.doctype,
                    doctype_label: __(info.doctype) || info.doctype,
                    name: info.name,
                    print_format: print_format || "",
                },
                freeze: false,
            });
        }, 250);
    }

    function is_print_button($el) {
        const text = ($el.text() || "").toLowerCase().trim();
        const title = ($el.attr("title") || "").toLowerCase();
        return text.includes("print") || text.includes("pdf") ||
               title.includes("print") || title.includes("pdf");
    }

    function attach_listeners() {
        $(document).on("click", function (e) {
            const $el = $(e.target);
            if ($el.is("button, a, .btn") || $el.closest("button, a, .btn").length) {
                const $target = $el.is("button, a, .btn") ? $el : $el.closest("button, a, .btn");
                if (is_print_button($target)) {
                    log_print($target.text().trim() || "Button");
                }
            }
        });
    }

    function init_print_tracker() {
        if (!get_print_info()) return;

        const original_print = window.print;
        window.print = function () {
            log_print("Browser Print");
            return original_print.apply(this, arguments);
        };

        window.addEventListener("beforeprint", function () {
            log_print("Browser Print");
        });

        attach_listeners();
    }

    $(document).ready(init_print_tracker);
})();
