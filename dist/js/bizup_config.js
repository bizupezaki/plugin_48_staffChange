/*
 * 顧客検索フィールド設定プラグイン
 * Copyright (c) 2021 BIZUP
 *
 */

(function (PLUGIN_ID) {
    'use strict';

    const { ref, reactive, h, computed, onMounted } = Vue;
    const client = new KintoneRestAPIClient();

    // プラグインIDの設定
    const KEY = PLUGIN_ID;
    const CONFDATA = kintone.plugin.app.getConfig(KEY);
    // 選択値のパースデータ;
    // const CONF = {};
    // if (CONFDATA) {
    //     for (let key in CONFDATA) {
    //         CONF[key] = JSON.parse(CONFDATA[key]);
    //     }
    // }
    const PARSE_CONF = CONFDATA.CONFIG_DATA ? JSON.parse(CONFDATA.CONFIG_DATA) : null;
    console.log(PARSE_CONF);

    // VueDraggableNextをdraggableとしてimport
    const { VueDraggableNext } = window;
    const app = Vue.createApp({
        setup() {
            const tableFieldsDef = [
                { code: '顧客コード', label: '顧客コード' },
                { code: '顧客名', label: '顧客名' },
                { code: 'ドロップダウン_法人個人区分', label: '法・個区分' },
                { code: '契約ステータス', label: '契約ステータス' },
                { code: 'ドロップダウン_決算月', label: '決算月' },
                { code: '契約開始日', label: '契約開始日' },
                { code: '契約完了日', label: '契約終了日' },
            ];

            /** プラグインに格納するデータ */
            const DATA = reactive({
                apps: {
                    CUSTOMER_APP_ID: null,
                    STAFF_APP_ID: null,
                },
                tableFields: [], // 初期は空、onMountedでセット
                staffFields: [
                    {
                        code: '担当者',
                        label: '担当者',
                        use: true,
                    },
                ],
            });

            const STATE = reactive({
                staffAppFields: [], // これも記録しておいて差分を調べる？否。
                mode: 'setting',
                allFields: [],
            });

            /** 保存 */
            const saveConf = () => {
                let errors = false;
                if (DATA.staffFields.filter((f) => f.use).length === 0) {
                    errors = true;
                }
                if (errors > 0) {
                    Swal.fire({
                        title: '設定項目エラー',
                        html: `担当者として使用するフィールドが一つも選択されていません。<br>最低一つは選択してください。`,
                        icon: 'error',
                        toast: true,
                        position: 'top',
                        timer: 2500,
                        showConfirmButton: false,
                    });
                } else {
                    // DATA全体を保存
                    //const CONF = structuredClone(Vue.toRaw(DATA));
                    const CONF = structuredClone(window.bizupUtil.common.deepUnproxy(DATA));
                    kintone.plugin.app.setConfig({
                        CONFIG_DATA: JSON.stringify(CONF),
                    });
                }
            };

            /** キャンセル */
            const cancelConf = () => {
                history.back();
            };

            /** リセット */
            const resetConf = () => {
                Swal.fire({
                    title: 'リセット確認',
                    html: '設定データをリセットしてよろしいですか？',
                    iconf: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'リセットする',
                    cancelButtonText: 'キャンセル',
                }).then((res) => {
                    if (res.isConfirmed) {
                        kintone.plugin.app.setConfig({});
                    }
                });
            };

            Vue.onMounted(async () => {
                // アプリID取得
                DATA.apps.CUSTOMER_APP_ID = kintone.app.getLookupTargetAppId('customerApp');
                DATA.apps.STAFF_APP_ID = kintone.app.getLookupTargetAppId('staffApp');

                // 顧客カルテアプリ上の担当者ルックアップフィールドを取得
                const customerFieldData = await client.app.getFormFields({ app: DATA.apps.CUSTOMER_APP_ID });
                console.log(customerFieldData);
                const staffFields = [];
                const preAllFields = [];

                Object.values(customerFieldData.properties).forEach((field) => {
                    if (Object.hasOwn(field, 'lookup') && Number(field.lookup.relatedApp.app) === Number(DATA.apps.STAFF_APP_ID)) {
                        staffFields.push(field);
                    }
                    preAllFields.push(field);
                });
                console.log(staffFields);

                // 設定データがあればapps, tableFields, staffFieldsすべてに反映
                if (PARSE_CONF) {
                    if (PARSE_CONF.apps) {
                        for (let key in PARSE_CONF.apps) {
                            DATA.apps[key] = PARSE_CONF.apps[key];
                        }
                    }
                    if (PARSE_CONF.tableFields) {
                        DATA.tableFields = structuredClone(PARSE_CONF.tableFields);
                    } else {
                        DATA.tableFields = structuredClone(tableFieldsDef);
                    }
                    if (PARSE_CONF.staffFields) {
                        DATA.staffFields = structuredClone(PARSE_CONF.staffFields);
                    }
                } else {
                    DATA.tableFields = structuredClone(tableFieldsDef);
                }

                // type/label情報をDATA.tableFieldsに付与（最新化）
                DATA.tableFields.forEach((tf) => {
                    const found = preAllFields.find((f) => f.code === tf.code);
                    if (found) {
                        tf.label = found.label;
                        tf.type = found.type;
                    }
                });

                // tableFieldsDef にもtype情報を付与してlabelも最新に更新
                tableFieldsDef.forEach((tf) => {
                    const found = preAllFields.find((f) => f.code === tf.code);
                    if (found) {
                        tf.label = found.label; // labelも最新に更新
                        tf.type = found.type;
                    }
                });

                // 顧客カルテのアプリのフォームレイアウトデータを取得
                const customerLayoutData = await client.app.getFormLayout({ app: DATA.apps.CUSTOMER_APP_ID });
                console.log(customerLayoutData);

                if (PARSE_CONF) {
                    // 設定データがある場合はセット
                    for (let key in PARSE_CONF.apps) {
                        DATA.apps[key] = PARSE_CONF.apps[key];
                    }
                }

                // レイアウトの順にstaffFieldsをSTATE.staffAppFields にセット
                STATE.staffAppFields = [];
                customerLayoutData.layout.forEach((layout) => {
                    if (layout.type === 'ROW') {
                        layout.fields.forEach((field) => {
                            const findField = staffFields.find((f) => f.code === field.code);
                            if (findField) {
                                // DATA.staffFieldsに設定されているかどうかでuseを設定
                                if (DATA.staffFields.find((sf) => sf.code === findField.code)) {
                                    findField.use = true;
                                } else {
                                    DATA.staffFields.push({
                                        code: findField.code,
                                        label: findField.label,
                                        use: true,
                                    });
                                }
                            }

                            // preAllFields もレイアウト順に並び替えて STATE.allFields にpush
                            const findAllField = preAllFields.find((f) => f.code === field.code);
                            if (findAllField) {
                                STATE.allFields.push({
                                    code: findAllField.code,
                                    label: findAllField.label,
                                    type: findAllField.type,
                                });
                            }
                        });
                    }
                });

                console.log(STATE.staffAppFields);

                STATE.mode = 'show';
            });

            // allFieldsからtableFieldsに含まれていないものだけを表示する算出プロパティ
            const availableFields = computed(() => {
                if (!DATA.tableFields) {
                    return STATE.allFields;
                }
                return STATE.allFields.filter((field) => !DATA.tableFields.some((f) => f.code === field.code));
            });

            // tableFieldsから削除
            const removeTableField = (index) => {
                DATA.tableFields.splice(index, 1);
            };

            // デフォルトに戻す
            const setDefault = () => {
                Swal.fire({
                    title: '初期状態にリセット',
                    html: '一覧に表示するフィールドを初期状態に戻します。よろしいですか？',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'リセット実行',
                    cancelButtonText: 'キャンセル',
                }).then((res) => {
                    if (res.isConfirmed) {
                        DATA.tableFields = structuredClone(tableFieldsDef);
                    }
                });
            };

            return {
                DATA,
                STATE,
                saveConf,
                cancelConf,
                resetConf,
                removeTableField,
                availableFields,
                setDefault,
            };
        },
        components: {
            draggable: window.VueDraggableNext.VueDraggableNext,
        },
        template: /* HTML */ `
            <div id="bz_config_main_container" v-if="STATE.mode==='show'">
                <h2>担当者フィールド選択</h2>
                <table class="bz_table_def">
                    <thead>
                        <th>フィールド名</th>
                        <th>フィールドコード</th>
                        <th>設定</th>
                    </thead>
                    <tbody>
                        <tr v-for="(field,index) in DATA.staffFields" :key="index">
                            <td>{{field.label}}</td>
                            <td>{{field.code}}</td>
                            <td><input type="checkbox" v-model="field.use" /> 担当者として使用する</td>
                        </tr>
                    </tbody>
                </table>
                <h2>テーブルフィールド選択</h2>
                <div class="bz_flex_container bz_flex_gap_30" id="bz_config_table_container">
                    <div>
                        <h3>一覧に表示するフィールド <button class="bz_bt_mini" @click="setDefault">リセット</button></h3>
                        <table class="bz_table_def" id="bz_config_table_fields">
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>フィールド名</th>
                                    <th>フィールドコード</th>
                                    <th>フィールドタイプ</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <draggable class="list-group" v-model="DATA.tableFields" tag="tbody" :component-data="{is:'tbody'}" handle=".bz_drag_handle" ghost-class="bz_draggable_ghost" :group="{ name: 'fields', pull: true, put: true }">
                                <tr v-for="(field,index) in DATA.tableFields" :key="field.code">
                                    <td class="bz_drag_handle">
                                        <span>☰</span>
                                    </td>
                                    <td>{{ field.label }}</td>
                                    <td>{{ field.code }}</td>
                                    <td>{{ field.type }}</td>
                                    <td><button class="bz_bt_def bz_bt_mini" @click="removeTableField(index)" :disabled="DATA.tableFields.length === 1">削除</button></td>
                                </tr>
                            </draggable>
                        </table>
                    </div>
                    <div>
                        <h3>全フィールド（一覧で表示するフィールドを左のテーブルにドラッグしてください）</h3>
                        <div class="bz_table_scroll_wrapper">
                            <table class="bz_table_def bz_table_sep" id="bz_config_table_list">
                                <thead>
                                    <tr>
                                        <th class="bz_col_handle"></th>
                                        <th>フィールド名</th>
                                        <th>フィールドコード</th>
                                        <th>型</th>
                                    </tr>
                                </thead>
                                <draggable :list="availableFields" :group="{ name: 'fields', pull: true, put: true }" item-key="code" tag="tbody">
                                    <tr v-for="field in availableFields" :key="field.code">
                                        <td class="bz_drag_handle">
                                            <span>☰</span>
                                        </td>
                                        <td>{{ field.label }}</td>
                                        <td>{{ field.code }}</td>
                                        <td>{{ field.type }}</td>
                                    </tr>
                                </draggable>
                            </table>
                        </div>
                    </div>
                </div>
                <div id="bz_config_footer">
                    <div id="bz_config_buttons">
                        <button class="bz_bt_def bz_bt_primary" @click="saveConf">保存</button>
                        <button class="bz_bt_def bz_bt_default" @click="cancelConf">キャンセル</button>
                        <button class="bz_bt_def bz_bt_danger" @click="resetConf">リセット</button>
                    </div>
                </div>
            </div>
        `,
    });

    // app.config.errorHandler = (err, vm, info) => {
    //     console.error(err, vm, info);
    //     // エラー処理ロジック
    //     Swal.fire('エラー発生', `エラーが発生しました。<br>プラグインデータをリセットします<br><br>${err}`, 'warning').then(() => {
    //         // kintone.plugin.app.setConfig({}, () => {
    //         //     location.reload();
    //         // });
    //     });
    // };
    app.mount('#bz_config_main');
})(kintone.$PLUGIN_ID);
