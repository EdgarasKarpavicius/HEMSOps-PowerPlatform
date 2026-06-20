"use strict";

var checklistVersion = window.checklistVersion = window.checklistVersion || {};
(function () {
    var checklistVersionEditorPageId = "1f0aee6c-966e-4ec1-a908-d257de6d65a5";
    var checklistVersionTableName = "int_checklistversion";
    var checklistTableName = "int_checklist";
    var defaultTitle = "Checklist Version Editor";

    function cleanId(id) {
        return id ? String(id).replace(/[{}]/g, "").trim() : "";
    }

    function getFormContext(value) {
        if (value && value.getAttribute) return value;
        if (value && value.getFormContext) return value.getFormContext();
        return null;
    }

    function getSelectedRecordId(value) {
        if (!value) return "";
        if (typeof value === "string") return cleanId(value);
        if (Array.isArray(value)) return getSelectedRecordId(value[0]);
        if (value.id || value.Id || value.recordId || value.RecordId) {
            return cleanId(value.id || value.Id || value.recordId || value.RecordId);
        }
        if (value.data && value.data.entity) return cleanId(value.data.entity.getId());
        if (value.getGrid) {
            var rows = value.getGrid().getSelectedRows();
            var row = rows && rows.getLength() ? rows.get(0) : null;
            return row ? cleanId(row.getData().getEntity().getId()) : "";
        }
        return "";
    }

    function getAttributeValue(formContext, name) {
        var attribute = formContext && formContext.getAttribute ? formContext.getAttribute(name) : null;
        return attribute ? attribute.getValue() : null;
    }

    function getVersionNumber(formContext) {
        var versionNumber = getAttributeValue(formContext, "int_versionnumber");
        return formatVersionNumber(versionNumber);
    }

    function getChecklistId(formContext) {
        var checklist = getAttributeValue(formContext, "int_checklist");
        return checklist && checklist[0] ? cleanId(checklist[0].id) : "";
    }

    function formatVersionNumber(value) {
        var rawValue = String(value === undefined || value === null ? "" : value).trim();
        if (!rawValue) return "";

        var numericValue = Number(rawValue);
        return isFinite(numericValue) ? numericValue.toFixed(2) : rawValue;
    }

    function buildTitle(checklistName, versionNumber) {
        return checklistName && versionNumber ? checklistName + " (" + versionNumber + ")" : defaultTitle;
    }

    function getTitleContext(recordId, formContext) {
        var versionNumber = getVersionNumber(formContext);
        var checklistId = getChecklistId(formContext);

        var versionPromise = checklistId || !Xrm.WebApi
            ? Promise.resolve({ checklistId: checklistId, versionNumber: versionNumber })
            : Xrm.WebApi.retrieveRecord(
                checklistVersionTableName,
                recordId,
                "?$select=int_versionnumber,_int_checklist_value"
            ).then(function (version) {
                return {
                    checklistId: cleanId(version._int_checklist_value),
                    versionNumber: versionNumber || formatVersionNumber(version.int_versionnumber)
                };
            });

        return versionPromise.then(function (context) {
            if (!context.checklistId || !Xrm.WebApi) {
                return { title: defaultTitle, checklistId: context.checklistId || "" };
            }

            return Xrm.WebApi.retrieveRecord(
                checklistTableName,
                context.checklistId,
                "?$select=int_name"
            ).then(function (checklist) {
                return {
                    title: buildTitle(checklist.int_name, context.versionNumber),
                    checklistId: context.checklistId
                };
            });
        }).catch(function () {
            return { title: defaultTitle, checklistId: checklistId };
        });
    }

    function openEditor() {
        var formContext = null;
        var recordId = "";

        for (var i = 0; i < arguments.length; i++) {
            formContext = formContext || getFormContext(arguments[i]);
            recordId = recordId || getSelectedRecordId(arguments[i]);
        }

        if (!recordId) {
            return Xrm.Navigation.openAlertDialog({ text: "No checklist version was selected." });
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

        return getTitleContext(recordId, formContext).then(function (context) {
            if (context.checklistId) pageInput.data.checklistId = context.checklistId;

            return Xrm.Navigation.navigateTo(pageInput, {
                target: 2,
                position: 1,
                width: { value: 95, unit: "%" },
                height: { value: 90, unit: "%" },
                title: context.title
            });
        });
    }

    this.openChecklistVersionEditor = openEditor;
    this.openChecklistVersionEditorById = function (recordId) {
        return openEditor(recordId);
    };
}).call(checklistVersion);
