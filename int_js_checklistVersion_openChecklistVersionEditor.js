"use strict";

var checklistVersion = window.checklistVersion = window.checklistVersion || {};
(function () {

    var checklistVersionEditorPageId = "1f0aee6c-966e-4ec1-a908-d257de6d65a5";
    var checklistVersionTableName = "int_checklistversion";
    var checklistTableName = "int_checklist";
    var defaultEditorTitle = "Checklist Version Editor";

    function normalizeRecordId(recordId) {
        if (!recordId) {
            return null;
        }

        return String(recordId).replace(/[{}]/g, "").trim();
    }

    function getRecordIdFromFormContext(formContext) {
        if (!formContext || !formContext.data || !formContext.data.entity) {
            return null;
        }

        return normalizeRecordId(formContext.data.entity.getId());
    }

    function getRecordIdFromSelectedRows(gridControl) {
        if (!gridControl || !gridControl.getGrid) {
            return null;
        }

        var selectedRows = gridControl.getGrid().getSelectedRows();
        if (!selectedRows || selectedRows.getLength() < 1) {
            return null;
        }

        var firstRow = selectedRows.get(0);
        if (!firstRow || !firstRow.getData) {
            return null;
        }

        return normalizeRecordId(firstRow.getData().getEntity().getId());
    }

    function getRecordIdFromArgument(value) {
        if (!value) {
            return null;
        }

        if (typeof value === "string") {
            return normalizeRecordId(value);
        }

        if (Array.isArray(value)) {
            return value.length ? getRecordIdFromArgument(value[0]) : null;
        }

        if (value.id || value.Id || value.recordId || value.RecordId) {
            return normalizeRecordId(value.id || value.Id || value.recordId || value.RecordId);
        }

        return getRecordIdFromFormContext(value) || getRecordIdFromSelectedRows(value);
    }

    function getRecordIdFromArguments(args) {
        for (var i = 0; i < args.length; i++) {
            var recordId = getRecordIdFromArgument(args[i]);
            if (recordId) {
                return recordId;
            }
        }

        return null;
    }

    function getValue(record, names, fallback) {
        for (var i = 0; i < names.length; i++) {
            var name = names[i];
            var formattedName = name + "@OData.Community.Display.V1.FormattedValue";

            if (record[formattedName] !== undefined && record[formattedName] !== null) {
                return record[formattedName];
            }

            if (record[name] !== undefined && record[name] !== null) {
                return record[name];
            }
        }

        return fallback;
    }

    function getRawValue(record, names, fallback) {
        for (var i = 0; i < names.length; i++) {
            var name = names[i];

            if (record[name] !== undefined && record[name] !== null) {
                return record[name];
            }
        }

        return fallback;
    }

    function getFormattedValue(record, name, fallback) {
        var formattedName = name + "@OData.Community.Display.V1.FormattedValue";

        if (record[formattedName] !== undefined && record[formattedName] !== null) {
            return record[formattedName];
        }

        return fallback;
    }

    function formatVersionNumber(value) {
        var rawValue = String(value === undefined || value === null ? "" : value).trim();
        if (!rawValue) {
            return "";
        }

        var numericValue = Number(rawValue);
        return isFinite(numericValue) ? numericValue.toFixed(2) : rawValue;
    }

    function buildEditorTitle(checklistName, versionNumber) {
        if (!checklistName || !versionNumber) {
            return defaultEditorTitle;
        }

        return checklistName + " V" + versionNumber;
    }

    function retrieveChecklistName(checklistId) {
        checklistId = normalizeRecordId(checklistId);

        if (!checklistId || typeof Xrm === "undefined" || !Xrm.WebApi || !Xrm.WebApi.retrieveRecord) {
            return Promise.resolve("");
        }

        return Xrm.WebApi.retrieveRecord(
            checklistTableName,
            checklistId,
            "?$select=int_name"
        ).then(function (record) {
            return String(getValue(record, ["int_name"], ""));
        });
    }

    function getEditorContext(recordId) {
        if (typeof Xrm === "undefined" || !Xrm.WebApi || !Xrm.WebApi.retrieveRecord) {
            return Promise.resolve({
                title: defaultEditorTitle,
                checklistId: ""
            });
        }

        return Xrm.WebApi.retrieveRecord(
            checklistVersionTableName,
            recordId,
            "?$select=int_versionnumber,_int_checklist_value"
        ).then(function (record) {
            var versionNumber = formatVersionNumber(getValue(record, ["int_versionnumber"], ""));
            var checklistName = String(getFormattedValue(record, "_int_checklist_value", ""));
            var checklistId = getRawValue(record, ["_int_checklist_value"], "");

            if (checklistName) {
                return {
                    title: buildEditorTitle(checklistName, versionNumber),
                    checklistId: normalizeRecordId(checklistId) || ""
                };
            }

            return retrieveChecklistName(checklistId).then(function (retrievedChecklistName) {
                return {
                    title: buildEditorTitle(retrievedChecklistName, versionNumber),
                    checklistId: normalizeRecordId(checklistId) || ""
                };
            });
        }).catch(function () {
            return {
                title: defaultEditorTitle,
                checklistId: ""
            };
        });
    }

    function openEditor(recordId) {
        recordId = normalizeRecordId(recordId);

        if (!recordId) {
            Xrm.Navigation.openAlertDialog({
                text: "No checklist version was selected."
            });
            return;
        }

        var pageInput = {
            pageType: "generative",
            pageId: checklistVersionEditorPageId,
            entityName: checklistVersionTableName,
            recordId: recordId,
            data: {
                checklistVersionId: recordId
            }
        };

        return getEditorContext(recordId).then(function (context) {
            if (context.checklistId) {
                pageInput.data.checklistId = context.checklistId;
            }

            var navigationOptions = {
                target: 2,
                position: 1,
                width: { value: 95, unit: "%" },
                height: { value: 90, unit: "%" },
                title: context.title
            };

            return Xrm.Navigation.navigateTo(pageInput, navigationOptions);
        });
    }

    this.openChecklistVersionEditor = function () {
        return openEditor(getRecordIdFromArguments(arguments));
    };

    this.openChecklistVersionEditorById = function (recordId) {
        return openEditor(recordId);
    };

}).call(checklistVersion);
