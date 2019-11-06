/**
 * Pimcore
 *
 * This source file is available under two different licenses:
 * - GNU General Public License version 3 (GPLv3)
 * - Pimcore Enterprise License (PEL)
 * Full copyright and license information is available in
 * LICENSE.md which is distributed with this source code.
 *
 * @copyright  Copyright (c) Pimcore GmbH (http://www.pimcore.org)
 * @license    http://www.pimcore.org/license     GPLv3 and PEL
 */

pimcore.registerNS("pimcore.object.tags.quantityValue");
pimcore.object.tags.quantityValue = Class.create(pimcore.object.tags.abstract, {

    type: "quantityValue",

    initialize: function (data, fieldConfig) {
        this.defaultValue = null;
        this.defaultUnit = null;
        this.autoConvert = false;
        if ((typeof data === "undefined" || data === null) && (fieldConfig.defaultValue || fieldConfig.defaultUnit || fieldConfig.autoConvert)) {
            data = {
                value: fieldConfig.defaultValue,
                unit: fieldConfig.defaultUnit,
                autoConvert: fieldConfig.autoConvert
            };
            this.defaultValue = data.value;
            this.defaultUnit = data.unit;
            this.autoConvert = data.autoConvert;
        }

        this.data = data;
        this.fieldConfig = fieldConfig;

        this.store = new Ext.data.JsonStore({
            autoDestroy: true,
            root: 'data',
            fields: ['id', 'abbreviation']
        });

        pimcore.helpers.quantityValue.initUnitStore(this.setData.bind(this), fieldConfig.validUnits);
    },

    setData: function(data) {
        var storeData = data.data;
        storeData.unshift({'id': -1, 'abbreviation' : "(" + t("empty") + ")"});

        this.store.loadData(storeData);

        if (this.unitField) {
            this.unitField.reset();
        }
    },

    getLayoutEdit: function () {

        var input = {};

        if (this.data && !isNaN(this.data.value)) {
            input.value = this.data.value;
        } else {
            // wipe invalid data
            if (this.data) {
                this.data.value = null;
            }
        }

        if (this.fieldConfig.width) {
            input.width = this.fieldConfig.width;
        }

        if (this.fieldConfig["decimalPrecision"] !== null) {
            input.decimalPrecision = this.fieldConfig["decimalPrecision"];
        }

        this.inputField = new Ext.form.field.Number(input);

        var labelWidth = 100;
        if (this.fieldConfig.labelWidth) {
            labelWidth = this.fieldConfig.labelWidth;
        }

        var unitWidth = 100;
        if(this.fieldConfig.unitWidth) {
            unitWidth = this.fieldConfig.unitWidth;
        }

        var options = {
            width: unitWidth,
            triggerAction: "all",
            autoSelect: true,
            editable: true,
            selectOnFocus: true,
            forceSelection: true,
            store: this.store,
            valueField: 'id',
            displayField: 'abbreviation',
            queryMode: 'local',
            listeners: {
                change: function( combo, newValue, oldValue) {
                    if(this.fieldConfig.autoConvert && oldValue && newValue) {
                        Ext.Ajax.request({
                            url: "/admin/quantity-value/convert",
                            params: {
                                value: this.inputField.value,
                                fromUnit: oldValue,
                                toUnit: newValue
                            },
                            success: function (response) {
                                response = Ext.decode(response.responseText);
                                if (response && response.success) {
                                    this.inputField.setValue(response.value);
                                }
                            }.bind(this)
                        });
                    }
                }.bind(this)
            }
        };

        if(this.data && this.data.unit != null && !isNaN(this.data.unit)) {
            options.value = this.data.unit;
        } else {
            options.value = -1;
        }

        this.unitField = new Ext.form.ComboBox(options);

        this.component = new Ext.form.FieldContainer({
            layout: 'hbox',
            margin: '0 0 10 0',
            fieldLabel: this.fieldConfig.title,
            labelWidth: labelWidth,
            combineErrors: false,
            items: [this.inputField, this.unitField],
            componentCls: "object_field",
            isDirty: function() {
                return this.inputField.isDirty() || this.unitField.isDirty()
            }.bind(this)
        });

        return this.component;
    },

    getGridColumnConfig:function (field) {
        var renderer = function (key, value, metaData, record) {
            this.applyPermissionStyle(key, value, metaData, record);

            if (record.data.inheritedFields[key] && record.data.inheritedFields[key].inherited == true) {
                try {
                    metaData.tdCls += " grid_value_inherited";
                } catch (e) {
                    console.log(e);
                }
            }

            if (value) {
                return (value.value ? value.value : "") + " " + value.unitAbbr;
            } else {
                return "";
            }

        }.bind(this, field.key);

        return {
            getEditor:this.getWindowCellEditor.bind(this, field),
            text:ts(field.label),
            sortable:true,
            dataIndex:field.key,
            renderer:renderer
        };
    },

    getGridColumnFilter: function (field) {
        pimcore.helpers.quantityValue.initUnitStore();

        Ext.define('Ext.grid.filters.filter.QuantityValue', {
            extend: 'Ext.grid.filters.filter.Number',
            alias: 'grid.filter.quantityValue',
            type: 'quantityValue',
            config: {
                /**
                 * @cfg {Object} [fields]
                 * Configures field items individually. These properties override those defined
                 * by `{@link #itemDefaults}`.
                 *
                 * Example usage:
                 *
                 *      fields: {
                 *          // Override itemDefaults for one field:
                 *          gt: {
                 *              width: 200
                 *          }
                 *
                 *          // "lt" and "eq" fields retain all itemDefaults
                 *      },
                 */
                fields: {
                    gt: {
                        iconCls: Ext.baseCSSPrefix + 'grid-filters-gt',
                        margin: '0 0 3px 0'
                    },
                    lt: {
                        iconCls: Ext.baseCSSPrefix + 'grid-filters-lt',
                        margin: '0 0 3px 0'
                    },
                    eq: {
                        iconCls: Ext.baseCSSPrefix + 'grid-filters-eq',
                        margin: '0 0 3px 0'
                    }
                }
            },
            createMenu: function() {
                var me = this;
                me.callParent();

                var cfg = {
                    xtype: 'combo',
                    name: 'unit',
                    labelClsExtra: Ext.baseCSSPrefix + 'grid-filters-icon pimcore_nav_icon_quantityValue',
                    queryMode: 'local',
                    editable: false,
                    forceSelection: true,
                    hideEmptyLabel: false,
                    store: pimcore.helpers.quantityValue.store,
                    valueField: 'id',
                    displayField: 'abbreviation',
                    margin: 0,
                    listeners: {
                        change: function(field) {
                            var me = this;

                            me.onValueChange(field, {RETURN: 1, getKey: function() {return null;}});
                        }.bind(this)
                    }
                };
                if (me.getItemDefaults()) {
                    cfg = Ext.merge({}, me.getItemDefaults(), cfg);
                }

                me.menu.insert(0, '-');
                me.fields.unit = me.menu.insert(0, cfg);
            }/*,
            getValue: function(field) {
                var me = this;
                var value = me.callParent([field]);

                for(var i in value) {
                    value[i] = [value[i], me.fields.unit.getValue()];
                }

                return value;
            }*/,
            setValue: function(value) {
                var me = this;

                for(var i in value) {
                    value[i] = [value[i], me.fields.unit.getValue()];
                }
                me.callParent([value]);
            }
        });

        return {
            type: 'quantityValue',
            dataIndex: field.key
        };
    },

    getLayoutShow: function () {
        this.getLayoutEdit();
        this.unitField.setReadOnly(true);
        this.inputField.setReadOnly(true);

        return this.component;
    },

    getValue: function () {
        return {
            unit: this.unitField.getValue(),
            unitAbbr: this.unitField.getRawValue(),
            value: this.inputField.getValue()
        };
    },

    getCellEditValue: function () {
        var value = this.getValue();
        value["unitAbbr"] = this.unitField.getRawValue();
        return value;
    },


    getName: function () {
        return this.fieldConfig.name;
    },

    isInvalidMandatory: function () {
        return !(this.unitField.getValue() && this.inputField.getValue());
    }
});
