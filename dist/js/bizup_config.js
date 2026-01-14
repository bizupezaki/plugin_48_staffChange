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
                { code: '顧客名', label: '顧客名' },
                { code: '担当者名', label: '担当者名' },
                { code: '担当者所属', label: '担当者所属' },
                { code: '副担当者名', label: '副担当者名' },
                { code: '副担当者所属', label: '副担当者所属' },
                { code: 'ドロップダウン_法人個人区分', label: '法・個区分' },
                { code: '契約ステータス', label: '契約ステータス' },
                { code: 'ドロップダウン_決算月', label: '決算月' },
                { code: '契約開始日', label: '契約開始日' },
                { code: '契約完了日', label: '契約終了日' },
            ];

            // 一覧表示固定用
            const fixedTableFields = [
                { code: '顧客コード', label: '顧客コード' },
                { code: '顧客名', label: '顧客名' },
                { code: '担当者コード', label: '担当者コード' },
                { code: '担当者', label: '担当者' },
                { code: 'チーム', label: 'チーム' },
                { code: '副担当者コード', label: '副担当者コード' },
                { code: '副担当者', label: '副担当者' },
                { code: '副チーム', label: '副担当者所属' },
            ];

            // 追加項目の削除ボタン表示・非表示制御用
            const deleteBtnDisabledity = {
                customer: { code: '顧客名', name: '顧客名', type: '', disable: false },
                staff: { code: '担当者名', name: '担当者名', type: '', disable: false },
                staffOrg: { code: '担当者所属', name: '担当者所属', type: '', disable: false },
                subStaff: { code: '副担当者名', name: '副担当者名', type: '', disable: false },
                subStaffOrg: { code: '副担当者所属', name: '副担当者所属', type: '', disable: false },
            };

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
                radOrg: 0, // 0:最初の所属組織で集計、-1:最後の所属組織で集計
            });

            const STATE = reactive({
                staffAppFields: [], // これも記録しておいて差分を調べる？否。
                mode: 'setting',
                allFields: [],
            });

            /** 保存 */
            const saveConf = () => {
                let errors = 0;
                if (DATA.staffFields.filter((f) => f.use).length === 0) {
                    errors = 1;
                } else if (!DATA.tableFields.some((f) => f.initialDisplay)) {
                    // initialDisplayが一つもONになっていない場合
                    errors = 2;
                }

                if (errors) {
                    let msg = '';
                    if (errors === 1) {
                        msg = `担当者として使用するフィールドが一つも選択されていません。<br>最低一つは選択してください。`;
                    } else if (errors === 2) {
                        msg = `一覧に表示するフィールドの「初期表示」が一つも選択されていません。<br>初期表示する項目を最低一つは選択してください。`;
                    }

                    Swal.fire({
                        title: '設定項目エラー',
                        html: msg,
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
                    // REFERENCE_TABLEは除外
                    // 顧客コード・顧客名・担当者コード・担当者名・担当者所属・副担当者コード・副担当者名・副担当者所属　は除外
                    let excludeCodes = [];
                    for (let i = 0; i < fixedTableFields.length; i++) {
                        excludeCodes.push(fixedTableFields[i].code);
                    }
                    if (field.type !== 'REFERENCE_TABLE' && !excludeCodes.includes(field.code)) {
                        //if (field.type !== 'REFERENCE_TABLE') {
                        preAllFields.push(field);
                    }
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
                    if (PARSE_CONF.radOrg) {
                        DATA.radOrg = structuredClone(PARSE_CONF.radOrg);
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
                    // initialDisplayの初期化
                    if (tf.initialDisplay === undefined) {
                        tf.initialDisplay = true;
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

                // 新たに追加（顧客名、担当者名、担当者所属、副担当者、副担当者所属）
                // DATA.tableFieldsに同じコードがなかった時のみ追加
                const itemsToAdd = [
                    { code: deleteBtnDisabledity.customer.code, label: deleteBtnDisabledity.customer.name, type: '', initialDisplay: true },
                    { code: deleteBtnDisabledity.staff.code, label: deleteBtnDisabledity.staff.name, type: '', initialDisplay: true },
                    { code: deleteBtnDisabledity.staffOrg.code, label: deleteBtnDisabledity.staffOrg.name, type: '', initialDisplay: true },
                    { code: deleteBtnDisabledity.subStaff.code, label: deleteBtnDisabledity.subStaff.name, type: '', initialDisplay: true },
                    { code: deleteBtnDisabledity.subStaffOrg.code, label: deleteBtnDisabledity.subStaffOrg.name, type: '', initialDisplay: true },
                ];
                const itemsToAddFiltered = itemsToAdd.filter((item) => !DATA.tableFields.some((field) => field.code === item.code));
                if (itemsToAddFiltered.length > 0) {
                    DATA.tableFields.splice(0, 0, ...itemsToAddFiltered);
                }

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

            // 削除ボタンを非表示にする
            const disableDeleteBtn = (code) => {
                let rc = false;
                for (let key in deleteBtnDisabledity) {
                    if (deleteBtnDisabledity[key].code === code) {
                        rc = true;
                        break;
                    }
                }
                return rc;
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
                        DATA.tableFields.forEach((f) => { f.initialDisplay = true; });
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
                disableDeleteBtn,
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

                <h2>集計方法</h2>
                <label for="radFirstOrg" class="radio-option"><input type="radio" @change="" id="radFirstOrg" name="radFirstOrg" v-model="DATA.radOrg" :value="0" />最初の所属組織で集計</label>
                <label for="radLastOrg"><input type="radio" @change="" id="radLastOrg" name="radLastOrg" v-model="DATA.radOrg" :value="-1" />最後の所属組織で集計</label>

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
                                    <th>初期表示</th>
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
                                    <td><button class="bz_bt_def bz_bt_mini" @click="removeTableField(index)" :disabled="disableDeleteBtn(field.code) || DATA.tableFields.length === 1">:削除</button></td>
                                    <td style="text-align: center;"><input type="checkbox" v-model="field.initialDisplay" /></td>
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
