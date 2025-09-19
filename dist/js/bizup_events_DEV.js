/**
 * BIZUP 担当者変更プラグイン
 * Copyright © 2025 Bizup
 */
(function (PLUGIN_ID) {
    ('use strict');

    const CONTAINER_ID = '#bz_update_staffs_container_DEV';
    const { ref, reactive, h, computed, onMounted } = Vue;

    // 設定値読み込み用変数
    var CONFDATA = kintone.plugin.app.getConfig(PLUGIN_ID);
    // 設定値読み込み
    // if (Object.keys(CONFDATA).length === 0) {
    //     return;
    // }

    //const client = new KintoneRestAPIClient();
    //const THIS_APP_ID = kintone.app.getId();
    const utils = window.bizupUtil; // 共通ユーティリティ
    const MAX_PATTERN = 3; // 追加パターンの最大数
    const HIGHTLIGHT_COLOR = '#ffecb3'; // ハイライトカラー
    const PATTERN_TITLE_COLOR = ['#FFFF00', '#64D2F0', '#92D050']; // パターンタイトルカラー
    const PATTERN_ITEMS_COLOR = ['#FFF2CC', '#DDEBF7', '#E2EFDA']; // 担当者選択カラー
    const PATTERN_CHANGE_COLOR = '#FFC000'; // 項目カラー

    // console.log(CONF);

    const STAFFMASTER_FIELD = {
        id: { readCd: '$id', writeCd: 'id', type: '__ID__', name: '' },
        revision: { readCd: '$revision', writeCd: 'revision', type: '__REVISION__', name: '' },
        staff: { cd: '担当者名', type: 'SINGLE_LINE_TEXT', name: '担当者名' },
        staffCode: { cd: '担当者コード', type: 'SINGLE_LINE_TEXT', name: '担当者コード' },
        kintoneAccount: { cd: 'ユーザー', type: 'USER_SELECT', name: 'kintoneアカウント' },
        approverAccount: { cd: '承認上長アカウント', type: 'USER_SELECT', name: '承認上長アカウント' },
        hireDate: { cd: '入社日', type: 'DATE', name: '入社日' },
        retireDate: { cd: '退社日', type: 'DATE', name: '退社日' },
        facility: { cd: '施設・備品', type: 'CHECK_BOX', name: '施設・設備' },
        organization: { cd: '組織選択', type: 'ORGANIZATION_SELECT', name: '所属' },
        hiddenFlag: { cd: '非表示フラグ', type: 'CHECK_BOX', name: '非表示フラグ' },
        // #region
        //住所: { cd: 'Address', type: 'SINGLE_LINE_TEXT', name: '住所' },
        //相続申告管理: { cd: '相続申告管理一覧', type: 'REFERENCE_TABLE', name: '相続申告管理' },
        //戻り日時: { cd: '戻り日時', type: 'DATETIME', name: '戻り日時' },
        //カスタムグループバックアップ: { cd: 'カスタムグループバックアップ', type: 'SINGLE_LINE_TEXT', name: 'カスタムグループバックアップ' },
        //ステータス: { cd: 'ステータス', type: 'STATUS', name: 'ステータス' },
        //タスク管理（自分が作業者）: { cd: 'タスク管理', type: 'REFERENCE_TABLE', name: 'タスク管理（自分が作業者）' },
        //月次業務管理: { cd: '月次業務管理', type: 'REFERENCE_TABLE', name: '月次業務管理' },
        //カテゴリー: { cd: 'カテゴリー', type: 'CATEGORY', name: 'カテゴリー' },
        //Googleカレンダー連携: { cd: 'Googleカレンダー連携', type: 'CHECK_BOX', name: 'Googleカレンダー連携' },
        //緊急連絡先: { cd: '緊急連絡先', type: 'SINGLE_LINE_TEXT', name: '緊急連絡先' },
        //担当顧客: { cd: '担当顧客', type: 'REFERENCE_TABLE', name: '担当顧客' },
        //作業者: { cd: '作業者', type: 'STATUS_ASSIGNEE', name: '作業者' },
        //システム利用域: { cd: 'システム利用域', type: 'GROUP', name: 'システム利用域' },
        //タスク管理（自分が作業指示者）: { cd: 'タスク管理_0', type: 'REFERENCE_TABLE', name: 'タスク管理（自分が作業指示者）' },
        //基本勤務時間: { cd: '基本勤務時間', type: 'CALC', name: '基本勤務時間' },
        //日報一覧: { cd: '日報一覧', type: 'REFERENCE_TABLE', name: '日報一覧' },
        //TEL: { cd: 'リンク', type: 'LINK', name: 'TEL' },
        //基本勤務曜日: { cd: '基本勤務曜日', type: 'CHECK_BOX', name: '基本勤務曜日' },
        //基本休憩時間: { cd: '基本休憩時間', type: 'NUMBER', name: '基本休憩時間' },
        //作成日時: { cd: '作成日時', type: 'CREATED_TIME', name: '作成日時' },
        //生産性対象除外: { cd: '生産性対象除外', type: 'CHECK_BOX', name: '生産性対象除外' },
        //担当者カナ: { cd: '担当者カナ', type: 'SINGLE_LINE_TEXT', name: '担当者カナ' },
        //更新者: { cd: '更新者', type: 'MODIFIER', name: '更新者' },
        //社員区分: { cd: '社員区分', type: 'DROP_DOWN', name: '社員区分' },
        //勤怠承認者アカウント: { cd: '勤怠承認者アカウント', type: 'USER_SELECT', name: '勤怠承認者アカウント' },
        //連絡先（所在検索用）: { cd: '所在検索用連絡先', type: 'SINGLE_LINE_TEXT', name: '連絡先（所在検索用）' },
        //担当者月額報酬額: { cd: '担当者月額報酬額', type: 'NUMBER', name: '担当者月額報酬額' },
        //基本退勤時刻: { cd: '基本退勤時刻', type: 'TIME', name: '基本退勤時刻' },
        //基本休憩開始日: { cd: '基本休憩開始日', type: 'DROP_DOWN', name: '基本休憩開始日' },
        //所在: { cd: '所在', type: 'DROP_DOWN', name: '所在' },
        //本日のスケジュール: { cd: '関連レコード一覧_0', type: 'REFERENCE_TABLE', name: '本日のスケジュール' },
        //作成者: { cd: '作成者', type: 'CREATOR', name: '作成者' },
        //標準時給: { cd: '時給', type: 'NUMBER', name: '標準時給' },
        //更新日時: { cd: '更新日時', type: 'UPDATED_TIME', name: '更新日時' },
        //郵便番号: { cd: '文字列__1行__2', type: 'SINGLE_LINE_TEXT', name: '郵便番号' },
        //決算進行管理: { cd: '決算進行管理', type: 'REFERENCE_TABLE', name: '決算進行管理' },
        //基本出勤時刻: { cd: '基本出勤時刻', type: 'TIME', name: '基本出勤時刻' },
        //基本休憩開始時刻: { cd: '基本休憩開始時刻', type: 'TIME', name: '基本休憩開始時刻' },
        //担当税理士区分: { cd: '担当税理士区分', type: 'DROP_DOWN', name: '担当税理士区分' },
        //所在メモ: { cd: '所在メモ', type: 'SINGLE_LINE_TEXT', name: '所在メモ' },
        // #endregion
    };

    // パターン追加テーブル
    const setPattern = {
        props: ['pattern', 'colspan'],
        emits: ['savePattern', 'replaceAllPattern', 'applyCustomerChartPattern'],
        template: `
            <tr v-if="pattern && pattern.length!==0">
                <th :colspan="colspan"></th>
                <th v-for="(item,index) in pattern" :key="index" colspan="4" :style="{ backgroundColor: item.titleColor }">
                        {{item.name}} 
                        <button @click="replaceAll(item)" class="bz_bt_def">担当者一括置換</button>
                        <button @click="save(item)" class="bz_bt_def">この設定を保存</button>
                        <button @click="apply(item)" class="bz_bt_def">顧客カルテに適用</button>
                </th>
            </tr>
        `,
        methods: {
            save(item) {
                this.$emit('savePattern', item);
            },
            replaceAll(item) {
                this.$emit('replaceAllPattern', item);
            },
            apply(item) {
                this.$emit('applyCustomerChartPattern', item);
            },
        },
    };

    // v-select
    const setVselect = {
        props: ['items', 'moduleValue', 'func'],
        template: `
            <div style="margin:20px 0;">
                <v-select :options="items" label="name" v-model="moduleValue" :filter="func">
                    <template v-slot:no-options="{ search, searching }"><!-- 検索結果がなかった場合のお約束…search:ユーザが入力した文字　searching:検索中かどうか -->
                        <div>担当者が見つかりません</div>
                    </template>
                    <template #option="{ code,name }"><!-- itemsのデータ構造による -->
                        <div>［{{ code }}］{{ name }}</div>
                    </template>
                </v-select>
            </div>
        `,
    };
    // vuer application
    const APP = {
        components: {
            'pattern-set': setPattern,
            'v-select': window['vue-select'], // 外部ライブラリ
        },
        setup() {
            const STATE = reactive({
                testData: [
                    {
                        code: '1001',
                        name: '山田 太郎',
                        kana: 'やまだ たろう',
                        orgs: [
                            { name: '営業部', code: '01_営業部' },
                            { name: '開発部', code: '02_開発部' },
                        ],
                    },
                    {
                        code: '1002',
                        name: '鈴木 次郎',
                        kana: 'すずき じろう',
                        orgs: [{ name: '営業2部', code: '03_営業2部' }],
                    },
                    {
                        code: '1003',
                        name: '佐藤 三郎',
                        kana: 'さとう さぶろう',
                        orgs: [{ name: '営業2部', code: '03_営業2部' }],
                    },
                    {
                        code: '1004',
                        name: '田中 花子',
                        kana: 'たなか はなこ',
                        orgs: [{ name: '営業部', code: '01_営業部' }],
                    },
                ],
                listData: {},
                listDataPattern: { clickNo: null, datas: [], clickName: '' },
                patternNames: { len: 0, index: 1, maxlength: MAX_PATTERN, names: [] },
                selectStaffs: [], // 担当者マスタの全データ
                testSelectedStaff: null,
                selectedStaff: null,
                filters: {}, // 絞り込み条件
                itemLength: 0, // 表示項目数
            });

            // 項目名除外
            const EXCEPT_ITEMS = ['$id', '$revision'];
            // 所属
            const ORG_ITEM = ['チーム', '副チーム'];

            // パターン名登録項目（コードと名称をひとつにした場合、別々にデータも保持するために持っている）
            let PATTERN_NAME_ITEMS = [
                { cd: '$id', label: '', type: '', visible: true },
                { cd: '担当者コード', label: '', type: '', visible: true },
                { cd: '担当者', label: '', type: '', visible: true },
                { cd: '副担当者コード', label: '', type: '', visible: true },
                { cd: '副担当者', label: '', type: '', visible: true },
                { cd: '顧客コード', label: '', type: '', visible: false },
                { cd: '顧客名', label: '', type: '', visible: false },
                { cd: '担当者所属コード', label: '', type: '', visible: false },
                { cd: '担当者所属', label: '', type: '', visible: false },
                { cd: '副担当者所属コード', label: '', type: '', visible: false },
                { cd: '副担当者所属', label: '', type: '', visible: false },
            ];
            const STAFF_CHANGE_FIELDCD = {
                jsonData: { cd: 'JSON', type: 'MULTI_LINE_TEXT', name: 'JSON' },
                patternName: { cd: 'パターン名', type: 'SINGLE_LINE_TEXT', name: 'パターン名' },
                appliedDate: { cd: '適用日', type: 'DATETIME', name: '適用日' },
                id: { readCd: '$id', writeCd: 'id', type: '__ID__', name: '' },
                revision: { readCd: '$revision', writeCd: 'revision', type: '__REVISION__', name: '' },
            };

            // コードと名称をひとつにまとめる
            const SELECTTYPE_NAME_ITEMS = [
                { cd: '担当者コード名', type: '', label: ' 担当者名', index: 1 },
                { cd: '副担当者コード名', type: '', label: ' 副担当者名', index: 3 },
                { cd: '顧客コード名', type: '', label: '顧客名', index: 0 },
                { cd: '担当者所属コード名', type: '', label: '担当者所属', index: 2 },
                { cd: '副担当者所属コード名', type: '', label: '副担当者所属', index: 4 },
            ];
            const CONF = CONFDATA.CONFIG_DATA ? JSON.parse(CONFDATA.CONFIG_DATA) : '';

            const selectedStaffName = computed(() => {
                if (!STATE.testSelectedStaff) return '';
                const staff = STATE.testData.find((s) => s.code === STATE.testSelectedStaff);
                return staff ? staff.name : '';
            });

            /**
             * v-select用フィルタ
             * @param {object} options 取得フィールド(選択されたもの)
             * @param {string} label ユーザが入力した文字
             * @param {string} itemText getOptionLabel(option)の結果（表示ラベル）
             * @returns {array} フィルタリングされたオプション
             */
            function customFilter(options, label, itemText) {
                // 自動的に3つの引数がおくられてくる
                if (!options) return false;
                if (!label) return options;
                const lower = label.toLowerCase(); // 大文字小文字の区別をしないため
                return options.filter((option) => {
                    return (
                        (option.code && option.code.toLowerCase().includes(lower)) ||
                        (option.name && option.name.toLowerCase().includes(lower)) ||
                        (option.kana && option.kana.toLowerCase().includes(lower)) ||
                        (Array.isArray(option.orgs) &&
                            option.orgs.some(function (org) {
                                return org && org.name && org.name.toLowerCase().includes(lower);
                            }))
                    );
                });
            }

            /**
             * 一覧表示
             * @param {array} fields 取得フィールド
             * @param {string} condition 検索条件
             * @param {string} orderby ソート順
             * @param {number} appId アプリID
             * @returns {} res レコード
             */
            const getRecords = async (fields, condition, orderby, appId) => {
                //console.log('getRecords');
                let res = null;

                try {
                    res = await utils.recordUtils.getRecords(fields, condition, orderby, appId);
                    if (res.length === 0) {
                        console.log('該当データなし！');
                    } else {
                    }
                    return res;
                } catch (error) {
                    console.error('getRecords:', error);
                }
            };

            /**
             * 新規追加
             * @param {array} data 登録データ
             * @param {number} appId アプリID
             * @returns {} res レコード
             */
            const insertRecords = async (data, appId) => {
                let res = null;
                try {
                    res = await utils.recordUtils.insertRecords(data, appId);
                    if (res.length === 0) {
                        console.log(data, ':登録データなし！（insertRecords）', res);
                    } else {
                        console.log(data, ':登録完了！（insertRecords）', res);
                    }
                    return res;
                } catch (error) {
                    console.error('insertRecords:', error);
                }
            };

            /**
             * 更新
             * @param {array} data 更新データ
             * @param {number} appId アプリID
             * @returns {} res レコード
             */
            const updateRecords = async (data, appId) => {
                console.log('updateData');

                let res = null;
                try {
                    res = await utils.recordUtils.updateRecords(data, appId);
                    if (res.length === 0) {
                        //console.log(jyoken, ':該当データなし！');
                        console.log(data, ':該当データなし！（updateRecords）', res);
                    } else {
                        console.log(data, ':更新完了！（updateRecords）', res);
                    }
                    return res;
                } catch (error) {
                    console.error('updateRecords:', error);
                }
            };

            /**
             * 未入力チェック
             * @param {String} value
             * @param {string} label 項目名
             * @returns {}
             */
            const validator = (value, label) => {
                if (!value || String(value).trim() === '') {
                    return label + 'を入力してください';
                }
                return null;
            };

            /**
             * 行選択チェック
             * @param {String} value 選択値
             * @returns {}
             */
            const validatorRow = (value) => {
                if (!value || String(value).trim() === '') {
                    return 'パターンを選択してください';
                }
                return null;
            };

            /**
             * パターン名入力画面作成
             * @param {String} title
             * @param {string} text
             * @param {string} inputType
             * @param {function} inputValidator
             * @param {string} inputValue
             * @param {string} confirmButtonText
             * @param {string} cancelButtonText
             * @returns {}
             */
            const showConfirmSwal = async ({ title, text, inputType = 'text', inputValidator, inputValue = '', confirmButtonText = 'OK', cancelButtonText = 'キャンセル' }) => {
                try {
                    const result = await Swal.fire({
                        title: title,
                        text: text,
                        input: inputType || undefined, // 'text', 'email', 'number', 'password', 'textarea', 'select', 'radio', 'checkbox', 'file'
                        showCancelButton: true,
                        confirmButtonText: confirmButtonText,
                        cancelButtonText: cancelButtonText,
                        inputValue: inputValue,
                        inputValidator: inputValidator,
                        width: 'auto',
                    });
                    //return result;
                    return result.isConfirmed ? result.value : null;
                } catch (error) {
                    console.error('入力アラートでエラーが発生しました:', error);
                    return {
                        isConfirmed: false, // はいクリックNG
                        isDismissed: true, // いいえクリックOK
                        isDenied: false, // キャンセルクリックNG
                        value: null,
                    };
                }
            };

            /**
             * パターン追加
             */
            const addPattern = async () => {
                //const fields = await utils.common.getFieldMap(utils.constants.THIS_APP_ID);
                //console.log('fields:', fields);
                if (STATE.patternNames.len >= MAX_PATTERN) {
                    Swal.fire({
                        title: 'パターン追加',
                        text: '追加できるパターンは最大' + MAX_PATTERN + 'つまでです。',
                        icon: 'warning',
                        confirmButtonText: '閉じる',
                    });
                    return;
                }

                // 入力画面表示
                const result = await showConfirmSwal({
                    title: 'パターン追加',
                    text: '新しいパターンの名前を入力してください。',
                    inputType: 'text',
                    confirmButtonText: '実行',
                    cancelButtonText: 'キャンセル',
                    inputValidator: (value) => validator(value, 'パターン名'),
                });
                //console.log('result:', result);
                if (result === null) {
                    // キャンセルの場合
                    return;
                }

                // JSONに変換
                const filtered = STATE.listData.datas.map((item) => {
                    return {
                        [PATTERN_NAME_ITEMS[0].cd]: item.datas[PATTERN_NAME_ITEMS[0].cd], // $id

                        [PATTERN_NAME_ITEMS[1].cd]: item.datas[PATTERN_NAME_ITEMS[1].cd], // 担当者
                        [PATTERN_NAME_ITEMS[2].cd]: item.datas[PATTERN_NAME_ITEMS[2].cd],
                        [PATTERN_NAME_ITEMS[3].cd]: item.datas[PATTERN_NAME_ITEMS[3].cd], // 副担当者
                        [PATTERN_NAME_ITEMS[4].cd]: item.datas[PATTERN_NAME_ITEMS[4].cd],

                        [PATTERN_NAME_ITEMS[7].cd]: item.datas[PATTERN_NAME_ITEMS[7].cd], // 担当者所属
                        [PATTERN_NAME_ITEMS[8].cd]: item.datas[PATTERN_NAME_ITEMS[8].cd],
                        [PATTERN_NAME_ITEMS[9].cd]: item.datas[PATTERN_NAME_ITEMS[9].cd], // 副担当者所属
                        [PATTERN_NAME_ITEMS[10].cd]: item.datas[PATTERN_NAME_ITEMS[10].cd],
                    };
                });
                const json = JSON.stringify(filtered, null, 2);
                //console.log('JSON:', json);
                // レコード登録
                const insertData = {
                    // id revision はinsert時に不要、仮にあったとしても無視される
                    [STAFF_CHANGE_FIELDCD.jsonData.cd]: { value: json },
                    [STAFF_CHANGE_FIELDCD.patternName.cd]: { value: result },
                };
                const ref = await insertRecords([insertData], utils.constants.THIS_APP_ID);

                // 追加したパターンを一覧に表示
                let cnt = STATE.patternNames.len + 1;
                const staff = ['新' + SELECTTYPE_NAME_ITEMS[0].cd + cnt, '新' + PATTERN_NAME_ITEMS[1].cd + cnt, '新' + PATTERN_NAME_ITEMS[2].cd + cnt];
                const subStaff = ['新' + SELECTTYPE_NAME_ITEMS[1].cd + cnt, '新' + PATTERN_NAME_ITEMS[3].cd + cnt, '新' + PATTERN_NAME_ITEMS[4].cd + cnt];
                const department = ['新' + SELECTTYPE_NAME_ITEMS[3].cd + cnt, '新' + PATTERN_NAME_ITEMS[7].cd + cnt, '新' + PATTERN_NAME_ITEMS[8].cd + cnt];
                const subDepartment = ['新' + SELECTTYPE_NAME_ITEMS[4].cd + cnt, '新' + PATTERN_NAME_ITEMS[9].cd + cnt, '新' + PATTERN_NAME_ITEMS[10].cd + cnt];

                //const staff = ['新' + PATTERN_NAME_ITEMS[1].label + cnt, '新' + PATTERN_NAME_ITEMS[2].label + cnt, '新' + PATTERN_NAME_ITEMS[3].label + cnt, '新' + PATTERN_NAME_ITEMS[4].label + cnt];
                STATE.listData.items.push({ code: staff[0], label: SELECTTYPE_NAME_ITEMS[0].label, type: '' });
                STATE.listData.items.push({ code: department[0], label: SELECTTYPE_NAME_ITEMS[3].label, type: '' });
                STATE.listData.items.push({ code: subStaff[0], label: SELECTTYPE_NAME_ITEMS[1].label, type: '' });
                STATE.listData.items.push({ code: subDepartment[0], label: SELECTTYPE_NAME_ITEMS[4].label, type: '' });
                //STATE.listData.items.push({ code: staff[1], label: PATTERN_NAME_ITEMS[2].label, type: '' });

                //STATE.listData.items.push({ code: staff[3], label: PATTERN_NAME_ITEMS[4].label, type: '' });

                const wkStaff = staff[0] + '_' + 'vmodel';
                const wkSubStaff = subStaff[0] + '_' + 'vmodel';
                const wkDepartment = department[0] + '_' + 'vmodel';
                const wkSubDepartment = subDepartment[0] + '_' + 'vmodel';

                // 現役の担当者取得
                const staffsCode = STATE.selectStaffs.map((s) => s[STAFFMASTER_FIELD.staffCode.cd]);
                // 所属コードのみ取得
                //const departmentsCode = STATE.selectStaffs.map((s) => s[STAFFMASTER_FIELD.organization.cd]).map((s) => s[0].code);

                STATE.listData.datas = STATE.listData.datas.map((item) => {
                    // 担当者コードと所属名は対になっているはずなので、担当者コードで現役かどうかをチェック
                    const idxS1 = staffsCode.indexOf(item.datas[PATTERN_NAME_ITEMS[1].cd]); // 担当者コード
                    const idxS2 = staffsCode.indexOf(item.datas[PATTERN_NAME_ITEMS[3].cd]); // 副担当者コード
                    return {
                        ...item,
                        datas: {
                            ...item.datas,

                            [staff[0]]: idxS1 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[0].cd] : '', // 担当者
                            [staff[1]]: idxS1 !== -1 ? item.datas[PATTERN_NAME_ITEMS[1].cd] : '',
                            [staff[2]]: idxS1 !== -1 ? item.datas[PATTERN_NAME_ITEMS[2].cd] : '',
                            [wkStaff]: idxS1 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[0].cd] : '', // 選択値保存用

                            [subStaff[0]]: idxS2 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[1].cd] : '', // 副担当者
                            [subStaff[1]]: idxS2 !== -1 ? item.datas[PATTERN_NAME_ITEMS[3].cd] : '',
                            [subStaff[2]]: idxS2 !== -1 ? item.datas[PATTERN_NAME_ITEMS[4].cd] : '',
                            [wkSubStaff]: idxS2 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[1].cd] : '',

                            [department[0]]: idxS1 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[3].cd] : '', // 担当者所属
                            [department[1]]: idxS1 !== -1 ? item.datas[PATTERN_NAME_ITEMS[7].cd] : '',
                            [department[2]]: idxS1 !== -1 ? item.datas[PATTERN_NAME_ITEMS[8].cd] : '',
                            [wkDepartment]: idxS1 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[3].cd] : '',

                            [subDepartment[0]]: idxS2 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[4].cd] : '', // 副担当者所属
                            [subDepartment[1]]: idxS2 !== -1 ? item.datas[PATTERN_NAME_ITEMS[9].cd] : '',
                            [subDepartment[2]]: idxS2 !== -1 ? item.datas[PATTERN_NAME_ITEMS[10].cd] : '',
                            [wkSubDepartment]: idxS2 !== -1 ? item.datas[SELECTTYPE_NAME_ITEMS[4].cd] : '',
                        },
                    };
                });
                STATE.patternNames.names.push({
                    index: cnt,
                    name: result,
                    id: ref.records[0].id,
                    revision: ref.records[0].revision,
                    titleColor: PATTERN_TITLE_COLOR[cnt - 1],
                    itemsColor: PATTERN_ITEMS_COLOR[cnt - 1],
                });

                // アイテムカラーを追加
                //STATE.patternNames.no = cnt;
                STATE.patternNames.len = cnt;

                // 絞込追加
                STATE.filters[staff[0]] = '';
                //STATE.filters[staff[1]] = '';
                //STATE.filters[staff[2]] = '';
                STATE.filters[subStaff[0]] = '';
                //STATE.filters[subStaff[1]] = '';
                //STATE.filters[subStaff[2]] = '';
                STATE.filters[department[0]] = '';
                STATE.filters[subDepartment[0]] = '';
            };

            /**
             * パターン開く
             */
            const openPattern = async () => {
                // 全フィールド取得
                //const fields = STATE.listData.items.map((item) => item.code);
                try {
                    const records = await getRecords([], '', '', utils.constants.THIS_APP_ID);
                    //console.log('openPattern取得結果:', records);
                    // 取得したデータをSwalを使って、表で表示する
                    if (!records || records.length === 0) {
                        Swal.fire({
                            title: '取得データ一覧',
                            html: '<div>データがありません</div>',
                            //width: '60%',
                            confirmButtonText: '閉じる',
                        });
                        return;
                    }
                    // 画面表示
                    const key = STAFF_CHANGE_FIELDCD.patternName.cd;
                    const label = STAFF_CHANGE_FIELDCD.patternName.name;
                    let patterns = [];
                    let tableHtml = '<table id="patternTable" class="bz_table_def">';
                    tableHtml += '<thead><tr>';
                    tableHtml += `<th>${label}</th>`;
                    tableHtml += '</tr></thead>';
                    tableHtml += '<tbody>';
                    records.forEach((rec) => {
                        tableHtml += '<tr>';
                        let val = rec[key]?.value ?? '';
                        tableHtml += `<td>${val}</td>`;
                        tableHtml += '</tr>';

                        // JSONデータを取得
                        patterns.push({ name: rec[key].value, jsonData: rec[STAFF_CHANGE_FIELDCD.jsonData.cd]?.value ?? '', id: rec[EXCEPT_ITEMS[0]].value, revision: rec[EXCEPT_ITEMS[1]].value });
                    });
                    tableHtml += '</tbody></table>';
                    tableHtml += '<input type="hidden" id="clickName" name="clickName" value="">';
                    const result = await Swal.fire({
                        title: '取得データ一覧',
                        html: tableHtml,
                        showCancelButton: true,
                        confirmButtonText: '実行',
                        cancelButtonText: 'キャンセル',
                        //inputValidator: (value) => validatorRow(value),
                        didOpen: () => {
                            setupRowClickHighlighting('patternTable');
                        },
                        preConfirm: () => {
                            const value = Swal.getPopup().querySelector('#clickName').value;
                            if (!value || String(value).trim() === '') {
                                Swal.showValidationMessage('パターンを選択してください');
                                return false;
                            }
                        },
                        //width: '80%',
                    });
                    if (result.dismiss === Swal.DismissReason.cancel) {
                        // キャンセルの場合
                        return;
                    }

                    // OK処理
                    // 3つより多い場合はエラー
                    if (STATE.patternNames.len >= MAX_PATTERN) {
                        Swal.fire({
                            title: 'パターン追加',
                            text: '追加できるパターンは最大' + MAX_PATTERN + 'つまでです。',
                            icon: 'warning',
                            confirmButtonText: '閉じる',
                        });
                        return;
                    }

                    STATE.listDataPattern.datas = patterns;
                    //console.log('listDataPattern:', STATE.listDataPattern);

                    // データをJSONからオブジェクトに変換してSTATEに保存
                    const jsonData = STATE.listDataPattern.datas[STATE.listDataPattern.clickNo].jsonData;
                    const clickData = JSON.parse(jsonData);
                    //console.log('クリックされた行のデータ:', clickData);

                    // パターン表示
                    let cnt = STATE.patternNames.len + 1;
                    const staff = ['新' + SELECTTYPE_NAME_ITEMS[0].cd + cnt, '新' + PATTERN_NAME_ITEMS[1].cd + cnt, '新' + PATTERN_NAME_ITEMS[2].cd + cnt];
                    const subStaff = ['新' + SELECTTYPE_NAME_ITEMS[1].cd + cnt, '新' + PATTERN_NAME_ITEMS[3].cd + cnt, '新' + PATTERN_NAME_ITEMS[4].cd + cnt];
                    const department = ['新' + SELECTTYPE_NAME_ITEMS[3].cd + cnt, '新' + PATTERN_NAME_ITEMS[7].cd + cnt, '新' + PATTERN_NAME_ITEMS[8].cd + cnt];
                    const subDepartment = ['新' + SELECTTYPE_NAME_ITEMS[4].cd + cnt, '新' + PATTERN_NAME_ITEMS[9].cd + cnt, '新' + PATTERN_NAME_ITEMS[10].cd + cnt];

                    STATE.listData.items.push({ code: staff[0], label: SELECTTYPE_NAME_ITEMS[0].label, type: '' });
                    STATE.listData.items.push({ code: department[0], label: SELECTTYPE_NAME_ITEMS[3].label, type: '' });
                    STATE.listData.items.push({ code: subStaff[0], label: SELECTTYPE_NAME_ITEMS[1].label, type: '' });
                    STATE.listData.items.push({ code: subDepartment[0], label: SELECTTYPE_NAME_ITEMS[4].label, type: '' });
                    //STATE.listData.items.push({ code: staff[3], label: PATTERN_NAME_ITEMS[4].label, type: '' });
                    /*const staff = ['新' + PATTERN_NAME_ITEMS[1].label + cnt, '新' + PATTERN_NAME_ITEMS[2].label + cnt, '新' + PATTERN_NAME_ITEMS[3].label + cnt, '新' + PATTERN_NAME_ITEMS[4].label + cnt];
                    STATE.listData.items.push({ code: staff[1], label: PATTERN_NAME_ITEMS[2].label, type: '' });
                    STATE.listData.items.push({ code: staff[3], label: PATTERN_NAME_ITEMS[4].label, type: '' });*/

                    const wkStaff = staff[0] + '_' + 'vmodel';
                    const wkSubStaff = subStaff[0] + '_' + 'vmodel';
                    const wkDepartment = department[0] + '_' + 'vmodel';
                    const wkSubDepartment = subDepartment[0] + '_' + 'vmodel';

                    // 現役の担当者取得
                    const staffsCode = STATE.selectStaffs.map((s) => s[STAFFMASTER_FIELD.staffCode.cd]);

                    // STATE.listData.datasに追加
                    STATE.listData.datas = STATE.listData.datas.map((item) => {
                        // JSONデータから該当IDのデータを取得
                        const matched = clickData.find((data) => data['$id'] === item.datas['$id']);
                        // 担当者コードと所属名は対になっているはずなので、担当者コードで現役かどうかをチェック
                        const idxS1 = staffsCode.indexOf(matched[PATTERN_NAME_ITEMS[1].cd]); // 担当者コード
                        const idxS2 = staffsCode.indexOf(matched[PATTERN_NAME_ITEMS[3].cd]); // 副担当者コード
                        return {
                            ...item,
                            datas: {
                                ...item.datas,
                                [staff[0]]: idxS1 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[1].cd] + ']' + matched[PATTERN_NAME_ITEMS[2].cd] : '', // 担当者
                                //matched ? matched[PATTERN_NAME_ITEMS[1].cd] : ''
                                [staff[1]]: idxS1 !== -1 ? matched[PATTERN_NAME_ITEMS[1].cd] : '',
                                [staff[2]]: idxS1 !== -1 ? matched[PATTERN_NAME_ITEMS[2].cd] : '',
                                [wkStaff]: idxS1 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[1].cd] + ']' + matched[PATTERN_NAME_ITEMS[2].cd] : '', // 選択値保存用

                                [subStaff[0]]: idxS2 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[3].cd] + ']' + matched[PATTERN_NAME_ITEMS[4].cd] : '', // 副担当者
                                [subStaff[1]]: idxS2 !== -1 ? matched[PATTERN_NAME_ITEMS[3].cd] : '',
                                [subStaff[2]]: idxS2 !== -1 ? matched[PATTERN_NAME_ITEMS[4].cd] : '',
                                [wkSubStaff]: idxS2 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[3].cd] + ']' + matched[PATTERN_NAME_ITEMS[4].cd] : '',

                                [department[0]]: idxS1 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[7].cd] + ']' + matched[PATTERN_NAME_ITEMS[8].cd] : '', // 担当者所属
                                [department[1]]: idxS1 !== -1 ? matched[PATTERN_NAME_ITEMS[7].cd] : '',
                                [department[2]]: idxS1 !== -1 ? matched[PATTERN_NAME_ITEMS[8].cd] : '',
                                [wkDepartment]: idxS1 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[7].cd] + ']' + matched[PATTERN_NAME_ITEMS[8].cd] : '',

                                [subDepartment[0]]: idxS2 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[9].cd] + ']' + matched[PATTERN_NAME_ITEMS[10].cd] : '', // 副担当者所属
                                [subDepartment[1]]: idxS2 !== -1 ? matched[PATTERN_NAME_ITEMS[9].cd] : '',
                                [subDepartment[2]]: idxS2 !== -1 ? matched[PATTERN_NAME_ITEMS[10].cd] : '',
                                [wkSubDepartment]: idxS2 !== -1 ? '[' + matched[PATTERN_NAME_ITEMS[9].cd] + ']' + matched[PATTERN_NAME_ITEMS[10].cd] : '',
                                /*[staff[0]]: matched ? matched[PATTERN_NAME_ITEMS[1].cd] : '',
                                [staff[1]]: matched ? matched[PATTERN_NAME_ITEMS[2].cd] : '',
                                [staff[2]]: matched ? matched[PATTERN_NAME_ITEMS[3].cd] : '',
                                [staff[3]]: matched ? matched[PATTERN_NAME_ITEMS[4].cd] : '',*/
                            },
                        };
                    });

                    // パターン追加
                    STATE.patternNames.names.push({
                        index: cnt,
                        name: STATE.listDataPattern.clickName,
                        id: STATE.listDataPattern.datas[STATE.listDataPattern.clickNo].id,
                        revision: STATE.listDataPattern.datas[STATE.listDataPattern.clickNo].revision,
                        titleColor: PATTERN_TITLE_COLOR[cnt - 1],
                        itemsColor: PATTERN_ITEMS_COLOR[cnt - 1], // アイテムカラーを追加
                    });
                    //STATE.patternNames.no = cnt;
                    STATE.patternNames.len = cnt;

                    // 絞込追加
                    STATE.filters[staff[0]] = '';
                    STATE.filters[subStaff[0]] = '';
                    STATE.filters[department[0]] = '';
                    STATE.filters[subDepartment[0]] = '';
                } catch (error) {
                    console.error('openPattern取得失敗:', error);
                }
            };

            /**
             * 顧客カルテに適用
             */
            const applyCustomerChartPattern = async (item) => {
                // データのバックアップ（レコード登録失敗時に元に戻すため）
                const datas = STATE.listData.datas;

                // 更新日時作成
                luxon.Settings.defaultLocale = 'ja';
                const updatedAt = luxon.DateTime.now().toUTC().toISO();

                // バックアップ用
                const backupStaff = [
                    PATTERN_NAME_ITEMS[1].cd + '_OLD', // 担当者コード
                    PATTERN_NAME_ITEMS[2].cd + '_OLD', // 担当者名
                    PATTERN_NAME_ITEMS[7].cd + '_OLD', // 担当者所属コード
                    PATTERN_NAME_ITEMS[8].cd + '_OLD', // 担当者所属名
                ];
                const backupSubStaff = [
                    PATTERN_NAME_ITEMS[3].cd + '_OLD', // 副担当者コード
                    PATTERN_NAME_ITEMS[4].cd + '_OLD', // 副担当者名
                    PATTERN_NAME_ITEMS[9].cd + '_OLD', // 副担当者所属コード
                    PATTERN_NAME_ITEMS[10].cd + '_OLD', // 副担当者所属名
                ];

                // 担当者の場合
                let staff = [];
                staff[0] = PATTERN_NAME_ITEMS[1].cd; // 担当者コード
                staff[1] = PATTERN_NAME_ITEMS[2].cd; // 担当者名
                staff[2] = PATTERN_NAME_ITEMS[7].cd; // 担当者所属コード
                staff[3] = PATTERN_NAME_ITEMS[8].cd; // 担当者所属名
                staff[4] = SELECTTYPE_NAME_ITEMS[0].cd; // 担当者コード名
                staff[5] = SELECTTYPE_NAME_ITEMS[3].cd; // 担当者所属コード名
                // 副担当者の場合
                let subStaff = [];
                subStaff[0] = PATTERN_NAME_ITEMS[3].cd; // 副担当者コード
                subStaff[1] = PATTERN_NAME_ITEMS[4].cd; // 副担当者名
                subStaff[2] = PATTERN_NAME_ITEMS[9].cd; // 副担当者所属コード
                subStaff[3] = PATTERN_NAME_ITEMS[10].cd; // 副担当者所属名
                subStaff[4] = SELECTTYPE_NAME_ITEMS[1].cd; // 副担当者コード名
                subStaff[5] = SELECTTYPE_NAME_ITEMS[4].cd; // 副担当者所属コード名

                STATE.listData.datas.forEach((data) => {
                    // 以前データをバックアップする
                    // 担当者
                    data.datas[backupStaff[0]] = data.datas[staff[0]];
                    data.datas[backupStaff[1]] = data.datas[staff[1]];
                    data.datas[backupStaff[2]] = data.datas[staff[2]];
                    data.datas[backupStaff[3]] = data.datas[staff[3]];
                    // 副担当者
                    data.datas[backupSubStaff[0]] = data.datas[subStaff[0]];
                    data.datas[backupSubStaff[1]] = data.datas[subStaff[1]];
                    data.datas[backupSubStaff[2]] = data.datas[subStaff[2]];
                    data.datas[backupSubStaff[3]] = data.datas[subStaff[3]];
                });

                // 顧客カルテ更新
                // 更新に失敗した場合、データを戻す

                // パターン登録
                await savePattern(item, updatedAt);
            };

            /**
             * パターン保存
             * @param {object} item パターンオブジェクト
             * @param {string} updatedAt 更新日時
             */
            const savePattern = async (item, updatedAt) => {
                //const item.index;
                const staff = ['新' + PATTERN_NAME_ITEMS[1].cd + item.index, '新' + PATTERN_NAME_ITEMS[2].cd + item.index];
                const subStaff = ['新' + PATTERN_NAME_ITEMS[3].cd + item.index, '新' + PATTERN_NAME_ITEMS[4].cd + item.index];
                const department = ['新' + PATTERN_NAME_ITEMS[7].cd + item.index, '新' + PATTERN_NAME_ITEMS[8].cd + item.index];
                const subDepartment = ['新' + PATTERN_NAME_ITEMS[9].cd + item.index, '新' + PATTERN_NAME_ITEMS[10].cd + item.index];

                // バックアップ用
                const backupStaff = [
                    PATTERN_NAME_ITEMS[1].cd + '_OLD', // 担当者コード
                    PATTERN_NAME_ITEMS[2].cd + '_OLD', // 担当者名
                    PATTERN_NAME_ITEMS[7].cd + '_OLD', // 担当者所属コード
                    PATTERN_NAME_ITEMS[8].cd + '_OLD', // 担当者所属名
                ];
                const backupSubStaff = [
                    PATTERN_NAME_ITEMS[3].cd + '_OLD', // 副担当者コード
                    PATTERN_NAME_ITEMS[4].cd + '_OLD', // 副担当者名
                    PATTERN_NAME_ITEMS[9].cd + '_OLD', // 副担当者所属コード
                    PATTERN_NAME_ITEMS[10].cd + '_OLD', // 副担当者所属名
                ];

                // JSONに変換
                const filtered = STATE.listData.datas.map((item) => {
                    const result = {
                        [PATTERN_NAME_ITEMS[0].cd]: item.datas[PATTERN_NAME_ITEMS[0].cd], // $id

                        [PATTERN_NAME_ITEMS[1].cd]: item.datas[staff[0]], // 担当者
                        [PATTERN_NAME_ITEMS[2].cd]: item.datas[staff[1]],
                        [PATTERN_NAME_ITEMS[3].cd]: item.datas[subStaff[0]], // 副担当者
                        [PATTERN_NAME_ITEMS[4].cd]: item.datas[subStaff[1]],

                        [PATTERN_NAME_ITEMS[7].cd]: item.datas[department[0]], // 担当者所属
                        [PATTERN_NAME_ITEMS[8].cd]: item.datas[department[1]],
                        [PATTERN_NAME_ITEMS[9].cd]: item.datas[subDepartment[0]], // 副担当者所属
                        [PATTERN_NAME_ITEMS[10].cd]: item.datas[subDepartment[1]],
                    };

                    // バックアップ用フィールドを追加
                    // もともとバックアップ用フィールドがあればその値を、なければnullをセット（未設定は空欄にしたいため）
                    result[backupStaff[0]] = utils.common.containsKey(item.datas, backupStaff[0]) ? item.datas[backupStaff[0]] : null; // 担当者コード
                    result[backupStaff[1]] = utils.common.containsKey(item.datas, backupStaff[1]) ? item.datas[backupStaff[1]] : null; // 担当者名
                    result[backupStaff[2]] = utils.common.containsKey(item.datas, backupStaff[2]) ? item.datas[backupStaff[2]] : null; // 担当者所属コード
                    result[backupStaff[3]] = utils.common.containsKey(item.datas, backupStaff[3]) ? item.datas[backupStaff[3]] : null; // 担当者所属名
                    result[backupSubStaff[0]] = utils.common.containsKey(item.datas, backupSubStaff[0]) ? item.datas[backupSubStaff[0]] : null; // 副担当者コード
                    result[backupSubStaff[1]] = utils.common.containsKey(item.datas, backupSubStaff[1]) ? item.datas[backupSubStaff[1]] : null; // 副担当者名
                    result[backupSubStaff[2]] = utils.common.containsKey(item.datas, backupSubStaff[2]) ? item.datas[backupSubStaff[2]] : null; // 副担当者所属コード
                    result[backupSubStaff[3]] = utils.common.containsKey(item.datas, backupSubStaff[3]) ? item.datas[backupSubStaff[3]] : null; // 副担当者所属名
                    result['更新日時'] = utils.common.containsKey(item.datas, '更新日時') ? item.datas['更新日時'] : null; // 更新日時

                    return result;
                });
                const json = JSON.stringify(filtered, null, 2);
                const id = item.id;
                const revision = item.revision;
                const name = item.name;
                //console.log('JSON:', json);
                // レコード更新
                const updateData = {
                    [STAFF_CHANGE_FIELDCD.id.writeCd]: id,
                    [STAFF_CHANGE_FIELDCD.revision.writeCd]: revision,
                    record: {
                        [STAFF_CHANGE_FIELDCD.jsonData.cd]: { value: json },
                        [STAFF_CHANGE_FIELDCD.patternName.cd]: { value: name },
                        [STAFF_CHANGE_FIELDCD.appliedDate.cd]: { value: updatedAt },
                    },
                };
                const ref = await updateRecords([updateData], utils.constants.THIS_APP_ID);
                if (ref.records.length > 0) {
                    // STATEのパターン名のrevisionを更新
                    const idx = STATE.patternNames.names.findIndex((p) => p.id === id);
                    if (idx !== -1) {
                        STATE.patternNames.names[idx].revision = ref.records[0].revision;
                    }
                } else {
                    console.error('パターン保存に失敗しました。');
                }
            };

            /**
             * 一括置換画面HTML作成
             * @param {string} staffs 担当者optionタグ
             * @param {string} staffsNew 変更後担当者optionタグ
             * @param {string} name パターン名
             * @return {string} html
             */
            const replaceAllHTML = (staffs, staffsNew, name) => {
                const html = `
                <div style="text-align: left;">
                    <p>変更する担当者区分を選択してください</p>
                        <span style="display:inline-block; border:1px solid #888; padding:4px 12px; margin-left:37px; margin-bottom:4px;">
                            <label style="margin:0;"><input type="checkbox" id="checkAll"> 全て選択</label>
                        </span><br>
                        <label style="margin-left:50px;"><input type="checkbox" id="staff" name="item" value="staff" checked> 担当者</label><br>
                        <label style="margin-left:50px;"><input type="checkbox" id="subStaff" name="item" value="subStaff"> 副担当者</label><br><br>
                    <p>変更する担当者を選択してください</p>

                    <p style="margin-left:20px; margin-bottom:4px;">変更元担当者</p>
                    <label style="margin-left:20px;"><input type="radio" name="staffRadio" value="pattern" checked> このパターンの担当者</label><br>
                    <label style="margin-left:20px;"><input type="radio" name="staffRadio" value="current"> 現在の顧客カルテの担当者</label><br><br>
                    <div style="margin-left:20px;" style="display: flex; align-items: center; gap: 8px;">
                        <select id="staffSelect">${staffsNew}</select>
                        <span>→</span>
                        <select id="afterStaffSelect">${staffsNew}</select>
                    </div>
                </div>
            `;
                return html;
            };

            /**
             * selectの設定
             */
            const generateBulkReplaceSelectOptions = (staffsCode, staffsCodePattern, substaffsCode) => {
                const radioButtons = Swal.getPopup().querySelectorAll('input[name="staffRadio"]:checked')[0];
                const staffCheckbox = Swal.getPopup().querySelector('#staff');
                const subStaffCheckbox = Swal.getPopup().querySelector('#subStaff');

                if (radioButtons.value === 'current' && staffCheckbox.checked && !subStaffCheckbox.checked) {
                    // 現在の顧客カルテの担当者　担当者のみ
                    options = staffsCode.map((opt) => `<option value="${opt.value}" key="${opt.value}">${opt.label}</option>`).join('');
                } else if (radioButtons.value === 'current' && !staffCheckbox.checked && subStaffCheckbox.checked) {
                    // 現在の顧客カルテの担当者　副担当者のみ
                    options = substaffsCode.map((opt) => `<option value="${opt.value}" key="${opt.value}">${opt.label}</option>`).join('');
                } else if (radioButtons.value === 'pattern') {
                    // パターンの担当者
                    options = staffsCodePattern.map((opt) => `<option value="${opt.value}" key="${opt.value}">${opt.label}</option>`).join('');
                } else if (staffCheckbox.checked && subStaffCheckbox.checked) {
                    // 担当者と副担当者のデータを比較
                    const combined = [...staffsCode, ...substaffsCode];
                    const uniqueCombined = Array.from(new Set(combined.map((opt) => opt.value))).map((value) => {
                        return combined.find((opt) => opt.value === value);
                    });
                    options = uniqueCombined.map((opt) => `<option value="${opt.value}" key="${opt.value}">${opt.label}</option>`).join('');
                }
                options = options + `<option value="__EMPTY__">未設定</option>`;
                return options;
            };

            /**
             * 担当者を一括置換
             * @param {object} item パターンオブジェクト
             */
            const replaceAllPattern = async (item) => {
                // 担当者情報取得
                const staffsCode = getUniqueOptions(SELECTTYPE_NAME_ITEMS[0].cd);
                const wk = '新' + SELECTTYPE_NAME_ITEMS[0].cd + item.index;
                const staffsCodePattern = getUniqueOptions(wk);
                const substaffsCode = getUniqueOptions(SELECTTYPE_NAME_ITEMS[1].cd); // 副担当者

                let optionStaffs = staffsCode.map((opt) => `<option value="${opt.value}" key="${opt.value}">${opt.label}</option>`).join('');
                optionStaffs = optionStaffs + `<option value="__EMPTY__">未設定</option>`;
                let optionStaffsPattern = staffsCodePattern.map((opt) => `<option value="${opt.value}" key="${opt.value}">${opt.label}</option>`).join('');
                optionStaffsPattern = optionStaffsPattern + `<option value="__EMPTY__">未設定</option>`;

                // 担当者一括置換画面HTML作成
                const html = replaceAllHTML(optionStaffs, optionStaffsPattern, item.name);

                /**
                 * 担当者一括置換ダイアログのイベント設定
                 */
                const setupBulkReplaceDialogEvents = () => {
                    // 担当者選択ラジオのイベント
                    const radioButtons = Swal.getPopup().querySelectorAll('input[name="staffRadio"]');
                    const select = Swal.getPopup().querySelector('#staffSelect');
                    radioButtons.forEach((radio) => {
                        radio.addEventListener('change', (event) => {
                            let options = generateBulkReplaceSelectOptions(staffsCode, staffsCodePattern, substaffsCode);

                            /*if (event.target.value === 'current') {
                                // 現在の担当者
                                options = staffsCode.map((opt) => `<option value="${opt.value}" key="${opt.value}">${opt.label}</option>`).join('');
                            } else if (event.target.value === 'pattern') {
                                // パターンの担当者
                                options = staffsCodePattern.map((opt) => `<option value="${opt.value}" key="${opt.value}">${opt.label}</option>`).join('');
                            }
                            options = options + `<option value="__EMPTY__">未設定</option>`;*/
                            select.innerHTML = options;
                        });
                    });

                    // 「全て選択」チェックボックスのイベント
                    const checkAllBox = Swal.getPopup().querySelector('#checkAll');
                    const staffCheckbox = Swal.getPopup().querySelector('#staff');
                    const subStaffCheckbox = Swal.getPopup().querySelector('#subStaff');
                    if (checkAllBox && staffCheckbox && subStaffCheckbox) {
                        // 「全て選択」チェックボックスのイベント
                        checkAllBox.addEventListener('change', function () {
                            const checked = checkAllBox.checked;
                            staffCheckbox.checked = checked;
                            subStaffCheckbox.checked = checked;
                            if (staffCheckbox.checked && subStaffCheckbox.checked) {
                                let options = generateBulkReplaceSelectOptions(staffsCode, staffsCodePattern, substaffsCode);
                                select.innerHTML = options;
                            }
                            if (staffCheckbox.checked || subStaffCheckbox.checked) {
                                Swal.resetValidationMessage();
                            }
                        });

                        // 担当者/副担当者チェックボックスのイベント
                        const handleStaffCheckChange = function () {
                            if (!staffCheckbox.checked || !subStaffCheckbox.checked) {
                                checkAllBox.checked = false;
                            }
                            if (staffCheckbox.checked && subStaffCheckbox.checked) {
                                checkAllBox.checked = true;
                            }
                            if (staffCheckbox.checked || subStaffCheckbox.checked) {
                                Swal.resetValidationMessage();
                            }
                            let options = generateBulkReplaceSelectOptions(staffsCode, staffsCodePattern, substaffsCode);
                            select.innerHTML = options;
                        };
                        staffCheckbox.addEventListener('change', handleStaffCheckChange);
                        subStaffCheckbox.addEventListener('change', handleStaffCheckChange);
                    }
                };

                // 担当者一括置換画面作成
                const result = await Swal.fire({
                    title: '担当者一括置換',
                    html: html,
                    showCancelButton: true,
                    confirmButtonText: '実行',
                    cancelButtonText: 'キャンセル',
                    width: '600px',
                    didOpen: setupBulkReplaceDialogEvents,
                    preConfirm: () => {
                        // チェックボックスのチェック有無
                        const staffChecked = Swal.getPopup().querySelector('#staff').checked;
                        const subStaffChecked = Swal.getPopup().querySelector('#subStaff').checked;
                        if ((!staffChecked || String(staffChecked).trim() === '') && (!subStaffChecked || String(subStaffChecked).trim() === '')) {
                            Swal.showValidationMessage('担当者区分を選択してください');
                            return false;
                        }
                        // 必要なデータを呼び出し元に渡す
                        const selectedStaff = Swal.getPopup().querySelector('#staffSelect').value; // 変更前担当者
                        const afterStaffSelect = Swal.getPopup().querySelector('#afterStaffSelect').value; // 変更後担当者
                        const radio = Swal.getPopup().querySelector('input[name="staffRadio"]:checked').value; // 顧客カルテ　パターン　から選択
                        const staffCheck = Swal.getPopup().querySelector('#staff').checked; // 担当者
                        const subStaffCheck = Swal.getPopup().querySelector('#subStaff').checked; // 副担当者

                        // 変更前と変更後の担当者が同じ場合はエラー
                        if (selectedStaff === afterStaffSelect) {
                            Swal.showValidationMessage('変更前と変更後の担当者が同じです。');
                            return false;
                        }

                        return {
                            staff: selectedStaff,
                            afterStaff: afterStaffSelect,
                            radio: radio,
                            staffCheck: staffCheck,
                            subStaffCheck: subStaffCheck,
                            index: item.index,
                        };
                    },
                    //width: '80%',
                });

                //console.log('result:', result);
                if (result.isDismissed) {
                    // キャンセルの場合
                    return;
                }

                // 一括置換処理
                let staff = [];
                let patternStaff = [];
                let subStaff = [];
                let patternSubStaff = [];
                let searchStaff = [];
                if (result.value.staffCheck) {
                    // 担当者の場合
                    staff[0] = PATTERN_NAME_ITEMS[1].cd; // 担当者コード
                    staff[1] = PATTERN_NAME_ITEMS[2].cd; // 担当者名
                    staff[2] = PATTERN_NAME_ITEMS[7].cd; // 担当者所属コード
                    staff[3] = PATTERN_NAME_ITEMS[8].cd; // 担当者所属名
                    staff[4] = SELECTTYPE_NAME_ITEMS[0].cd; // 担当者コード名
                    staff[5] = SELECTTYPE_NAME_ITEMS[3].cd; // 担当者所属コード名
                    //staff[6] = '更新日時'; // 更新日時

                    patternStaff[0] = '新' + PATTERN_NAME_ITEMS[1].cd + result.value.index; // 担当者コード
                    patternStaff[1] = '新' + PATTERN_NAME_ITEMS[2].cd + result.value.index; // 担当者名
                    patternStaff[2] = '新' + PATTERN_NAME_ITEMS[7].cd + result.value.index; // 担当者所属コード
                    patternStaff[3] = '新' + PATTERN_NAME_ITEMS[8].cd + result.value.index; // 担当者所属名
                    patternStaff[4] = '新' + SELECTTYPE_NAME_ITEMS[0].cd + result.value.index; // 担当者コード名
                    patternStaff[5] = '新' + SELECTTYPE_NAME_ITEMS[3].cd + result.value.index; // 担当者所属コード名

                    // 検索値の設定
                    if (result.value.radio === 'current') {
                        searchStaff[0] = staff[0];
                    } else if (result.value.radio === 'pattern') {
                        searchStaff[0] = patternStaff[0];
                    } else {
                        searchStaff[0] = '';
                    }
                }

                if (result.value.subStaffCheck) {
                    // 副担当者の場合
                    subStaff[0] = PATTERN_NAME_ITEMS[3].cd; // 副担当者コード
                    subStaff[1] = PATTERN_NAME_ITEMS[4].cd; // 副担当者名
                    subStaff[2] = PATTERN_NAME_ITEMS[9].cd; // 副担当者所属コード
                    subStaff[3] = PATTERN_NAME_ITEMS[10].cd; // 副担当者所属名
                    subStaff[4] = SELECTTYPE_NAME_ITEMS[1].cd; // 副担当者コード名
                    subStaff[5] = SELECTTYPE_NAME_ITEMS[4].cd; // 副担当者所属コード名
                    subStaff[6] = '更新日時'; // 更新日時

                    patternSubStaff[0] = '新' + PATTERN_NAME_ITEMS[3].cd + result.value.index; // 副担当者コード
                    patternSubStaff[1] = '新' + PATTERN_NAME_ITEMS[4].cd + result.value.index; // 副担当者名
                    patternSubStaff[2] = '新' + PATTERN_NAME_ITEMS[9].cd + result.value.index; // 副担当者所属コード
                    patternSubStaff[3] = '新' + PATTERN_NAME_ITEMS[10].cd + result.value.index; // 副担当者所属名
                    patternSubStaff[4] = '新' + SELECTTYPE_NAME_ITEMS[1].cd + result.value.index; // 副担当者コード名
                    patternSubStaff[5] = '新' + SELECTTYPE_NAME_ITEMS[4].cd + result.value.index; // 副担当者所属コード名

                    // 検索値の設定
                    if (result.value.radio === 'current') {
                        searchStaff[1] = subStaff[0];
                    } else if (result.value.radio === 'pattern') {
                        searchStaff[1] = patternSubStaff[0];
                    } else {
                        searchStaff[1] = '';
                    }
                }

                // 更新日時作成
                /*let DateTime = luxon.DateTime;
                luxon.Settings.defaultLocale = 'ja';
                const updatedAt = DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss');*/

                const selectedStaffCode = result.value.staff === '__EMPTY__' ? '' : result.value.staff; // 変更前担当者コード
                const afterStaffCode = result.value.afterStaff;

                STATE.listData.datas.forEach((item) => {
                    // 選択された担当者コードと同じ場合は置換
                    // 担当者
                    if (staff.length > 0 && item.datas[searchStaff[0]] === selectedStaffCode) {
                        /*// 以前データをバックアップする
                        item.datas[staff[0] + '_OLD'] = item.datas[staff[0]];
                        item.datas[staff[1] + '_OLD'] = item.datas[staff[1]];
                        item.datas[staff[2] + '_OLD'] = item.datas[staff[2]];
                        item.datas[staff[3] + '_OLD'] = item.datas[staff[3]];
                        item.datas[staff[6]] = updatedAt; // 更新日時
                        //item.datas[item[4] + '_OLD'] = item.datas[item[4]];*/
                        // 変更後データをセット
                        //item.datas[staff[0]] = afterStaffCode;
                        item.datas[patternStaff[0]] = afterStaffCode;

                        STATE.selectStaffs
                            .filter((s) => s[STAFFMASTER_FIELD.staffCode.cd] === afterStaffCode)
                            .forEach((s) => {
                                /*item.datas[staff[1]] = s[STAFFMASTER_FIELD.staff.name];
                                item.datas[staff[2]] = s[STAFFMASTER_FIELD.organization.cd] && s[STAFFMASTER_FIELD.organization.cd].length > 0 ? s[STAFFMASTER_FIELD.organization.cd][0].code : '';
                                item.datas[staff[3]] = s[STAFFMASTER_FIELD.organization.cd] && s[STAFFMASTER_FIELD.organization.cd].length > 0 ? s[STAFFMASTER_FIELD.organization.cd][0].name : '';
                                */

                                item.datas[patternStaff[1]] = s[STAFFMASTER_FIELD.staff.name];
                                item.datas[patternStaff[2]] = s[STAFFMASTER_FIELD.organization.cd] && s[STAFFMASTER_FIELD.organization.cd].length > 0 ? s[STAFFMASTER_FIELD.organization.cd][0].code : '';
                                item.datas[patternStaff[3]] = s[STAFFMASTER_FIELD.organization.cd] && s[STAFFMASTER_FIELD.organization.cd].length > 0 ? s[STAFFMASTER_FIELD.organization.cd][0].name : '';
                            });
                        /*item.datas[staff[4]] = '[' + item.datas[staff[0]] + ']' + item.datas[staff[1]];
                        item.datas[staff[5]] = '[' + item.datas[staff[2]] + ']' + item.datas[staff[3]];
                        item.datas[staff[4] + '_vmodel'] = item.datas[staff[4]];*/
                        item.datas[patternStaff[4]] = '[' + item.datas[patternStaff[0]] + ']' + item.datas[patternStaff[1]];
                        item.datas[patternStaff[5]] = '[' + item.datas[patternStaff[2]] + ']' + item.datas[patternStaff[3]];
                        item.datas[patternStaff[4] + '_vmodel'] = item.datas[patternStaff[4]];
                    }
                    // 副担当者
                    if (subStaff.length > 0 && item.datas[searchStaff[1]] === selectedStaffCode) {
                        /*// 以前データをバックアップする
                        item.datas[subStaff[0] + '_OLD'] = item.datas[subStaff[0]];
                        item.datas[subStaff[1] + '_OLD'] = item.datas[subStaff[1]];
                        item.datas[subStaff[2] + '_OLD'] = item.datas[subStaff[2]];
                        item.datas[subStaff[3] + '_OLD'] = item.datas[subStaff[3]];
                        item.datas[subStaff[6]] = updatedAt; // 更新日時*/

                        // 変更後データをセット
                        //item.datas[subStaff[0]] = afterStaffCode;
                        item.datas[patternSubStaff[0]] = afterStaffCode;

                        STATE.selectStaffs
                            .filter((s) => s[STAFFMASTER_FIELD.staffCode.cd] === afterStaffCode)
                            .forEach((s) => {
                                /*item.datas[subStaff[1]] = s[STAFFMASTER_FIELD.staff.cd];
                                item.datas[subStaff[2]] = s[STAFFMASTER_FIELD.organization.cd] && s[STAFFMASTER_FIELD.organization.cd].length > 0 ? s[STAFFMASTER_FIELD.organization.cd][0].code : '';
                                item.datas[subStaff[3]] = s[STAFFMASTER_FIELD.organization.cd] && s[STAFFMASTER_FIELD.organization.cd].length > 0 ? s[STAFFMASTER_FIELD.organization.cd][0].name : '';
                                */
                                item.datas[patternSubStaff[1]] = s[STAFFMASTER_FIELD.staff.cd];
                                item.datas[patternSubStaff[2]] = s[STAFFMASTER_FIELD.organization.cd] && s[STAFFMASTER_FIELD.organization.cd].length > 0 ? s[STAFFMASTER_FIELD.organization.cd][0].code : '';
                                item.datas[patternSubStaff[3]] = s[STAFFMASTER_FIELD.organization.cd] && s[STAFFMASTER_FIELD.organization.cd].length > 0 ? s[STAFFMASTER_FIELD.organization.cd][0].name : '';
                            });
                        /*item.datas[subStaff[4]] = '[' + item.datas[subStaff[0]] + ']' + item.datas[subStaff[1]];
                        item.datas[subStaff[5]] = '[' + item.datas[subStaff[2]] + ']' + item.datas[subStaff[3]];
                        item.datas[subStaff[4] + '_vmodel'] = item.datas[subStaff[4]];*/
                        item.datas[patternSubStaff[4]] = '[' + item.datas[patternSubStaff[0]] + ']' + item.datas[patternSubStaff[1]];
                        item.datas[patternSubStaff[5]] = '[' + item.datas[patternSubStaff[2]] + ']' + item.datas[patternSubStaff[3]];
                        item.datas[patternSubStaff[4] + '_vmodel'] = item.datas[patternSubStaff[4]];
                    }
                });

                // 顧客カルテ更新
                // 更新に失敗した場合、データを戻す

                // パターン登録
                //await savePattern(item);

                console.log('一括置換が完了しました');
            };

            /**
             * 一括置換担当者リスト取得
             * @param {string} tableId テーブルID
             * @param {string} highlightClass ハイライトカラー
             */
            const getStaffList = (selectedStaff) => {
                let code = '';
                if ('current' === selectedStaff) {
                    code = SELECTTYPE_NAME_ITEMS[0].cd;
                } else {
                    const num = Number(selectedStaff.match(/\d+/));
                    code = '新' + SELECTTYPE_NAME_ITEMS[0].cd + num;
                }

                const rc = getUniqueOptions(code);
                return rc;
            };
            /**
             * 行クリックでハイライト設定
             * @param {string} tableId テーブルID
             * @param {string} highlightClass ハイライトカラー
             */
            const setupRowClickHighlighting = (tableId, highlightClass = HIGHTLIGHT_COLOR) => {
                const rows = document.querySelectorAll(`#${tableId} tbody tr`);
                rows.forEach((row) => {
                    row.addEventListener('click', () => {
                        // 既存のハイライトを削除
                        rows.forEach((r) => {
                            r.style.backgroundColor = '';
                        });
                        // クリックされた行にハイライトを追加
                        row.style.backgroundColor = highlightClass;

                        // クリックされた行のデータをSTATEに保存
                        const tbody = row.parentElement;
                        const rowsInTbody = Array.from(tbody.querySelectorAll('tr'));
                        const relativeIndex = rowsInTbody.indexOf(row);

                        STATE.listDataPattern.clickNo = relativeIndex;
                        STATE.listDataPattern.clickName = row.textContent;

                        // クリックされた行のパターン名をSwalのinputにセット
                        Swal.getPopup().querySelector('#clickName').value = STATE.listDataPattern.clickName;
                        Swal.resetValidationMessage(); // バリデーションメッセージをリセット

                        //console.log('クリックされた行のインデックス:', STATE.listDataPattern.clickNo);
                    });
                });
            };

            /**
             * フィルタリングされた行を取得
             */
            const filteredRows = computed(() => {
                if (!STATE.listData?.datas || !Array.isArray(STATE.listData.datas)) return [];
                return STATE.listData.datas.filter((item) => {
                    return Object.keys(STATE.filters).every((key) => {
                        const filterValue = String(STATE.filters[key] ?? '').trim();
                        if (filterValue === 'すべて') return true;
                        //const cellValue = String(item.datas[key] ?? '');
                        let cd = '';
                        let nm = '';
                        if (key === SELECTTYPE_NAME_ITEMS[0].cd) {
                            cd = PATTERN_NAME_ITEMS[1].cd;
                            nm = PATTERN_NAME_ITEMS[2].label;
                        } else if (key === SELECTTYPE_NAME_ITEMS[1].cd) {
                            cd = PATTERN_NAME_ITEMS[3].cd;
                            nm = PATTERN_NAME_ITEMS[4].label;
                        } else if (key === SELECTTYPE_NAME_ITEMS[2].cd) {
                            cd = PATTERN_NAME_ITEMS[5].cd;
                            nm = PATTERN_NAME_ITEMS[6].label;
                        } else if (key === SELECTTYPE_NAME_ITEMS[3].cd) {
                            cd = PATTERN_NAME_ITEMS[7].cd;
                            nm = PATTERN_NAME_ITEMS[8].label;
                        } else if (key === SELECTTYPE_NAME_ITEMS[4].cd) {
                            cd = PATTERN_NAME_ITEMS[9].cd;
                            nm = PATTERN_NAME_ITEMS[10].label;
                        } else {
                            /*if (key === PATTERN_NAME_ITEMS[2].cd || key === PATTERN_NAME_ITEMS[4].cd || key === PATTERN_NAME_ITEMS[6].cd) {
                            cd = key === PATTERN_NAME_ITEMS[2].cd ? PATTERN_NAME_ITEMS[1].cd : PATTERN_NAME_ITEMS[3].cd;
                            nm = key === PATTERN_NAME_ITEMS[2].cd ? PATTERN_NAME_ITEMS[2].label : PATTERN_NAME_ITEMS[4].label;
                        }*/

                            // この箇所はメソッドにするかも
                            // 新パターン名での絞込対応
                            const indexes = STATE.patternNames.names.map((item) => item.index);
                            if (indexes.some((index) => key.includes(index))) {
                                const num = Number(key.match(/\d+/)); // 数値のみ取得
                                const str = key.replace(/\d+/g, ''); // 数値部分削除
                                if (str === '新' + PATTERN_NAME_ITEMS[2].cd) {
                                    cd = '新' + PATTERN_NAME_ITEMS[1].cd + num;
                                    nm = '新' + PATTERN_NAME_ITEMS[2].label + num;
                                } else if (str === '新' + PATTERN_NAME_ITEMS[4].cd) {
                                    cd = '新' + PATTERN_NAME_ITEMS[3].cd + num;
                                    nm = '新' + PATTERN_NAME_ITEMS[4].label + num;
                                }
                            }
                        }
                        const cellValue = key === nm ? item.datas[cd] : item.datas[key] ?? '';
                        if (filterValue === '') return true; // 絞込なし
                        if (filterValue === '__EMPTY__') return cellValue === ''; // 空のみ
                        return cellValue.toLowerCase().includes(filterValue.toLowerCase());
                    });
                });
            });

            /**
             * 絞込作成
             */
            const getUniqueOptions = (code) => {
                //const values = (STATE.listData?.datas ?? []).map((item) => item.datas[code]).filter((v) => v !== undefined && v !== null && String(v).trim() !== '');
                //return [...new Set(values)];
                let cd = '';
                let nm = '';
                let staffFlg = [false, false]; // 担当者、副担当者フラグ
                let departmentFlg = [false, false]; // 担当者所属、副担当者所属フラグ

                // この箇所はメソッドにするかも
                const indexes = STATE.patternNames.names.map((item) => item.index);
                //if (code.includes(indexes)) {
                if (indexes.some((index) => code.includes(index))) {
                    // 新パターン名での絞込対応
                    const num = Number(code.match(/\d+/)); // 数値のみ取得
                    const str = code.replace(/\d+/g, ''); // 数値部分削除
                    if (str === '新' + SELECTTYPE_NAME_ITEMS[0].cd) {
                        cd = '新' + PATTERN_NAME_ITEMS[1].cd + num;
                        nm = '新' + PATTERN_NAME_ITEMS[2].label + num;
                        staffFlg[0] = true;
                    } else if (str === '新' + SELECTTYPE_NAME_ITEMS[1].cd) {
                        cd = '新' + PATTERN_NAME_ITEMS[3].cd + num;
                        nm = '新' + PATTERN_NAME_ITEMS[4].label + num;
                        staffFlg[1] = true;
                    } else if (str === '新' + SELECTTYPE_NAME_ITEMS[3].cd) {
                        cd = '新' + PATTERN_NAME_ITEMS[7].cd + num;
                        nm = '新' + PATTERN_NAME_ITEMS[8].label + num;
                        departmentFlg[0] = true;
                    } else if (str === '新' + SELECTTYPE_NAME_ITEMS[4].cd) {
                        cd = '新' + PATTERN_NAME_ITEMS[9].cd + num;
                        nm = '新' + PATTERN_NAME_ITEMS[10].label + num;
                        departmentFlg[1] = true;
                    }
                }

                // 担当者、副担当者、顧客名のときはコード＋名前で表示
                if (code === SELECTTYPE_NAME_ITEMS[0].cd) {
                    // 担当者
                    cd = PATTERN_NAME_ITEMS[1].cd;
                    nm = PATTERN_NAME_ITEMS[2].label;
                } else if (code === SELECTTYPE_NAME_ITEMS[1].cd) {
                    // 副担当者
                    cd = PATTERN_NAME_ITEMS[3].cd;
                    nm = PATTERN_NAME_ITEMS[4].label;
                } else if (code === SELECTTYPE_NAME_ITEMS[2].cd) {
                    // 顧客名
                    cd = PATTERN_NAME_ITEMS[5].cd;
                    nm = PATTERN_NAME_ITEMS[6].label;
                } else if (code === SELECTTYPE_NAME_ITEMS[3].cd) {
                    // 担当者所属
                    cd = PATTERN_NAME_ITEMS[7].cd;
                    nm = PATTERN_NAME_ITEMS[8].label;
                } else if (code === SELECTTYPE_NAME_ITEMS[4].cd) {
                    // 副担当者所属
                    cd = PATTERN_NAME_ITEMS[9].cd;
                    nm = PATTERN_NAME_ITEMS[10].label;
                }

                let pairs = [];
                if (code === SELECTTYPE_NAME_ITEMS[0].cd || code === SELECTTYPE_NAME_ITEMS[1].cd || staffFlg.some((f) => f)) {
                    // 担当者選択のときはスタッフマスタから取得
                    // selectStaffsから表示用selectのデータ作成
                    // 施設・備品キーの値が配列データの「施設・備品」を除いたデータをfilteredStaffsに代入
                    let filteredStaffs = Array.isArray(STATE.selectStaffs) ? STATE.selectStaffs.filter((staff) => !(Array.isArray(staff['施設・備品']) && staff['施設・備品'].length > 0)) : [];
                    // 非表示フラグキーの値が配列データでないもののみを取得
                    filteredStaffs = Array.isArray(filteredStaffs) ? filteredStaffs.filter((staff) => !(Array.isArray(staff['非表示フラグ']) && staff['非表示フラグ'].length > 0)) : [];
                    // 退社日キーがnull, 空文字, undefinedの場合のみ抽出
                    filteredStaffs = Array.isArray(filteredStaffs) ? filteredStaffs.filter((staff) => staff['退社日'] === null || staff['退社日'] === '' || typeof staff['退社日'] === 'undefined') : [];

                    cd = STAFFMASTER_FIELD.staffCode.cd;
                    nm = STAFFMASTER_FIELD.staff.cd;

                    pairs = (filteredStaffs ?? [])
                        .filter((item) => item[cd] !== undefined && item[cd] !== null && String(item[cd]).trim() !== '')
                        .map((item) => ({
                            label: '[' + item[cd] + ']' + item[nm],
                            value: item[cd],
                        }));

                    if (!staffFlg.some((f) => f)) {
                        // STATE.listData.datasにあってpairsにない担当者コード・担当者名をpairsの最後に追加
                        const pairsCodes = pairs.map((p) => p.value);
                        (STATE.listData.datas ?? []).forEach((item) => {
                            let staffCode = '';
                            let staffName = '';
                            if (code === SELECTTYPE_NAME_ITEMS[0].cd) {
                                staffCode = item.datas?.[PATTERN_NAME_ITEMS[1].cd];
                                staffName = item.datas?.[PATTERN_NAME_ITEMS[2].cd];
                            } else {
                                staffCode = item.datas[PATTERN_NAME_ITEMS[3].cd];
                                staffName = item.datas[PATTERN_NAME_ITEMS[4].cd];
                            }
                            if (staffCode && !pairsCodes.includes(staffCode)) {
                                pairs.push({
                                    label: '[' + staffCode + ']' + staffName,
                                    value: staffCode,
                                });
                            }
                        });
                    }
                } else if (code === SELECTTYPE_NAME_ITEMS[3].cd || code === SELECTTYPE_NAME_ITEMS[4].cd || departmentFlg.some((f) => f)) {
                    // 所属選択のときは部署マスタから取得
                    // 施設・備品キーの値が配列データの「施設・備品」を除いたデータをfilteredStaffsに代入
                    let filteredDepartments = Array.isArray(STATE.selectStaffs) ? STATE.selectStaffs.filter((staff) => !(Array.isArray(staff['施設・備品']) && staff['施設・備品'].length > 0)) : [];
                    // 非表示フラグキーの値が配列データでないもののみを取得
                    filteredDepartments = Array.isArray(filteredDepartments) ? filteredDepartments.filter((dept) => !(Array.isArray(dept['非表示フラグ']) && dept['非表示フラグ'].length > 0)) : [];
                    // 退社日キーがnull, 空文字, undefinedの場合のみ抽出
                    filteredDepartments = Array.isArray(filteredDepartments) ? filteredDepartments.filter((dept) => dept['退社日'] === null || dept['退社日'] === '' || typeof dept['退社日'] === 'undefined') : [];

                    //cd = DEPARTMENTMASTER_FIELD.organization.cd;
                    //nm = DEPARTMENTMASTER_FIELD.organization.cd;

                    // 組織選択キーの配列データからlabel/valueオブジェクト配列を作成
                    pairs = (filteredDepartments ?? [])
                        .filter((item) => Array.isArray(item[STAFFMASTER_FIELD.organization.cd]) && item[STAFFMASTER_FIELD.organization.cd].length > 0)
                        .flatMap((item) =>
                            item[STAFFMASTER_FIELD.organization.cd].map((org) => ({
                                label: '[' + org.code + ']' + org.name,
                                value: org.code,
                            }))
                        );
                    if (!departmentFlg.some((f) => f)) {
                        // STATE.listData.datasにあってpairsにない担当者コード・担当者名をpairsの最後に追加
                        const pairsCodes = pairs.map((p) => p.value);
                        (STATE.listData.datas ?? []).forEach((item) => {
                            let departmentCode = '';
                            let departmentName = '';
                            if (code === SELECTTYPE_NAME_ITEMS[3].cd) {
                                departmentCode = item.datas?.[PATTERN_NAME_ITEMS[7].cd];
                                departmentName = item.datas?.[PATTERN_NAME_ITEMS[8].cd];
                            } else {
                                departmentCode = item.datas[PATTERN_NAME_ITEMS[9].cd];
                                departmentName = item.datas[PATTERN_NAME_ITEMS[10].cd];
                            }
                            if (departmentCode && !pairsCodes.includes(departmentCode)) {
                                pairs.push({
                                    label: '[' + departmentCode + ']' + departmentName,
                                    value: departmentCode,
                                });
                            }
                        });
                    }
                } else {
                    // それ以外は通常処理
                    pairs = (STATE.listData?.datas ?? [])
                        .filter((item) => item.datas[cd] !== undefined && item.datas[cd] !== null && String(item.datas[cd]).trim() !== '')
                        .map((item) => ({
                            label: '[' + item.datas[cd] + ']' + item.datas[nm],
                            value: item.datas[cd],
                        }));
                }

                // 重複削除
                const unique = new Map();
                pairs.forEach((pair) => {
                    if (!unique.has(pair.value)) {
                        unique.set(pair.value, pair.label);
                    }
                });

                // 配列からオブジェクトに変換して返す
                let rc = Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
                rc = rc.sort((a, b) => {
                    if (a.value < b.value) return -1;
                    if (a.value > b.value) return 1;
                    return 0;
                });

                return rc;

                // それ以外の項目
                //const values = (STATE.listData?.datas ?? []).map((item) => item.datas[code]).filter((v) => v !== undefined && v !== null && String(v).trim() !== '');
                //return [...new Set(values)].map((v) => ({ value: v, label: v }));
            };

            /**
             * ラベルから新たにラベルを作成
             * @param {string} label（ラベル）
             * @return {string} 新たなラベル
             */
            const setNewLabel = (label) => {
                if (label !== PATTERN_NAME_ITEMS[2].label && label !== PATTERN_NAME_ITEMS[4].label) {
                    return label;
                } else {
                    if (label === PATTERN_NAME_ITEMS[2].label) {
                        return SELECTTYPE_NAME_ITEMS[0].label;
                    } else {
                        return SELECTTYPE_NAME_ITEMS[1].label;
                    }
                }
            };

            /**
             * コードから表示非表示判定
             * @param {string} key コード
             * @return {boolean} true:表示、false:非表示
             */
            const isVisibleItem = (key) => {
                let rc = true;

                // 除外項目
                const patterns = PATTERN_NAME_ITEMS.filter((item) => item.cd !== '$id').map((cd) => cd.cd);
                const exccempts = EXCEPT_ITEMS.concat(patterns, ORG_ITEM); // id revision 担当者コード　副担当者コード
                if (exccempts.includes(key)) {
                    rc = false;
                }
                return rc;
            };

            /**
             * ラベルから表示非表示判定
             * @param {string} label ラベル
             * @return {boolean} true:表示、false:非表示
             */
            const isVisibleLabel = (label) => {
                let rc = true;

                // 除外項目
                const patterns = PATTERN_NAME_ITEMS.filter((item) => item.cd !== '$id').map((cd) => cd.label);
                const exccempts = EXCEPT_ITEMS.concat(patterns, ORG_ITEM); // id revision 担当者コード　副担当者コード
                if (exccempts.includes(label)) {
                    rc = false;
                }
                //console.log('isVisibleLabel:', code, ' rc:', rc);
                return rc;
            };

            /**
             * ラベルから表示非表示判定
             * @param {string} label ラベル
             * @return {boolean} true:選択項目、false:テキスト項目
             */
            const isSelectType = (label) => {
                let rc = false;

                // 選択項目
                const select = SELECTTYPE_NAME_ITEMS.map((item) => item.label);
                if (select.includes(label)) {
                    rc = true;
                }
                return rc;
            };

            /**
             * keyが新担当者コード名、新副担当者コード名のときは、trueをかえす
             * @param {string} key コード
             * @return {boolean} true:新担当者コード名 or 新副担当者コード名　false:それ以外
             */
            const isSelectData = (key) => {
                let rc = false;
                const indexes = STATE.patternNames.names.map((item) => item.index);
                //console.log('isSelectData key:', key, ' indexes:', indexes);
                if (indexes.some((index) => key.includes(index))) {
                    const num = Number(key.match(/\d+/)); // 数値のみ取得
                    const str = key.replace(/\d+/g, ''); // 数値部分削除
                    //console.log('some num:', num, ' str:', str);
                    if (str === '新' + SELECTTYPE_NAME_ITEMS[0].cd || str === '新' + SELECTTYPE_NAME_ITEMS[1].cd) {
                        rc = true;
                        //STATE.patternNames.index = num;
                    }
                }
                return rc;
            };

            /**
             * selectのv-model用のkeyを返す
             * @param {string} key コード
             * @return {string} v-model用key
             */
            const setSelectVmodel = (key) => {
                /*console.log('setNo index:', index, ' key:', key);
                console.log('STATE.itemLength:', STATE.itemLength);
                console.log('STATE.listData.items.length:', STATE.listData.items.length);
                console.log('STATE.patternNames.len:', STATE.patternNames.len);*/
                let rc = '';
                rc = key + '_' + 'vmodel'; // v-model用
                /*let name = key;
                let sa = index - STATE.itemLength;
                if (sa <= 3) {
                    rc = '1';
                } else if (sa <= 7) {
                    rc = '2';
                } else {
                    rc = '3';
                }
                return name + '_' + rc;*/
            };

            /**
             * パターンを追加したデータはすべてselectにする
             * @param {string} key コード
             * @return {}
             */
            const getSelectedStaff = (key) => {
                return [...new Set(STATE.listData.datas.map((item) => item.datas[key]))];
            };

            /**
             * 担当者選択変更時の処理
             * @param {number} index 行番号
             * @param {object} event イベント
             * @param {string} key コード
             */
            const changeStaff = (id, event, key) => {
                // 取得したデータをcodeとnameに分割
                // 例: [10002]鈴木 二美 → code: 10002, name: 鈴木 二美
                const value = event.target.value;
                let code = '';
                let name = '';
                const match = value.match(/^\[(.*?)\](.*)$/);
                if (match) {
                    code = match[1];
                    name = match[2];
                }

                // id からindexを取得
                const index = STATE.listData.datas.findIndex((item) => item.datas['$id'] === id);
                if (index === -1) return;

                STATE.listData.datas[index].datas[key] = value;
                const num = Number(key.match(/\d+/)); // 数値のみ取得
                const str = key.replace(/\d+/g, ''); // 数値部分削除
                let cd = ''; // 担当者
                let nm = '';
                let orgCd = ''; // 担当者所属
                let orgNm = '';
                let org = ''; // 所属の[code]name用

                if (str === '新' + SELECTTYPE_NAME_ITEMS[0].cd) {
                    cd = '新' + PATTERN_NAME_ITEMS[1].cd + num;
                    nm = '新' + PATTERN_NAME_ITEMS[2].label + num;
                    orgCd = '新' + PATTERN_NAME_ITEMS[7].cd + num;
                    orgNm = '新' + PATTERN_NAME_ITEMS[8].label + num;
                    org = '新' + SELECTTYPE_NAME_ITEMS[3].cd + num;
                } else if (str === '新' + SELECTTYPE_NAME_ITEMS[1].cd) {
                    cd = '新' + PATTERN_NAME_ITEMS[3].cd + num;
                    nm = '新' + PATTERN_NAME_ITEMS[4].label + num;
                    orgCd = '新' + PATTERN_NAME_ITEMS[9].cd + num;
                    orgNm = '新' + PATTERN_NAME_ITEMS[10].label + num;
                    org = '新' + SELECTTYPE_NAME_ITEMS[4].cd + num;
                }
                STATE.listData.datas[index].datas[cd] = code;
                STATE.listData.datas[index].datas[nm] = name;

                // 担当者変更に伴って、所属も変更する
                if (code !== '') {
                    const staff = STATE.selectStaffs.find((staff) => staff[STAFFMASTER_FIELD.staffCode.cd] === code);
                    const orgs = staff[STAFFMASTER_FIELD.organization.cd];
                    STATE.listData.datas[index].datas[org] = '[' + orgs[0].code + ']' + orgs[0].name;
                    STATE.listData.datas[index].datas[orgCd] = orgs[0].code;
                    STATE.listData.datas[index].datas[orgNm] = orgs[0].name;
                } else {
                    // 空の場合は所属も空にする
                    STATE.listData.datas[index].datas[org] = '';
                    STATE.listData.datas[index].datas[orgCd] = '';
                    STATE.listData.datas[index].datas[orgNm] = '';
                }
                //console.log('changeStaff:', index, event, key, ' code:', code, ' name:', name, ' cd:', cd, ' nm:', nm);
            };

            /**
             * コードから背景色を設定
             * @param {string} key コード
             * @return {string} 背景色
             */
            const setTitleBackColor = (key) => {
                const num = Number(key.match(/\d+/)); // 数値のみ取得
                const str = key.replace(/\d+/g, ''); // 数値部分削除
                const pattern = ['新' + SELECTTYPE_NAME_ITEMS[0].cd, '新' + SELECTTYPE_NAME_ITEMS[1].cd, '新' + SELECTTYPE_NAME_ITEMS[3].cd, '新' + SELECTTYPE_NAME_ITEMS[4].cd];

                let color = '';
                if (pattern.includes(str)) {
                    //const index = pattern.findIndex((p) => p === str);
                    color = PATTERN_TITLE_COLOR[num - 1];
                }
                return color;
            };
            /**
             * コードから背景色を設定
             * @param {string} key コード
             * @return {string} 背景色
             */
            const setItemBackColor = (key, datas) => {
                const num = Number(key.match(/\d+/)); // 数値のみ取得
                const str = key.replace(/\d+/g, ''); // 数値部分削除
                const patterns = ['新' + SELECTTYPE_NAME_ITEMS[0].cd, '新' + SELECTTYPE_NAME_ITEMS[1].cd, '新' + SELECTTYPE_NAME_ITEMS[3].cd, '新' + SELECTTYPE_NAME_ITEMS[4].cd];
                const items = SELECTTYPE_NAME_ITEMS.filter((item) => item.cd !== SELECTTYPE_NAME_ITEMS[2].cd);

                // 背景色
                let color = '';
                if (patterns.includes(str)) {
                    color = PATTERN_ITEMS_COLOR[num - 1];
                }
                // 表示用とデータが違う場合、背景色を変更する
                const index = patterns.findIndex((p) => p === str);
                if (index !== -1 && color !== '') {
                    if (datas[items[index].cd] !== datas[key]) {
                        color = PATTERN_CHANGE_COLOR;
                    }
                }
                return color;
            };

            /**
             * コードから新たな項目名を作成
             * @param {string} key コード
             */
            const makeNewItemName = (key) => {
                const indexes = STATE.patternNames.names.map((item) => item.index);
                //if (code.includes(indexes)) {
                let cd = '';
                let nm = '';
                if (indexes.some((index) => key.includes(index))) {
                    // 新パターン名での絞込対応
                    const num = Number(key.match(/\d+/)); // 数値のみ取得
                    const str = key.replace(/\d+/g, ''); // 数値部分削除
                    if (str === '新' + PATTERN_NAME_ITEMS[2].cd) {
                        cd = '新' + PATTERN_NAME_ITEMS[1].cd + num;
                        nm = '新' + PATTERN_NAME_ITEMS[2].label + num;
                    } else if (str === '新' + PATTERN_NAME_ITEMS[4].cd) {
                        cd = '新' + PATTERN_NAME_ITEMS[3].cd + num;
                        nm = '新' + PATTERN_NAME_ITEMS[4].label + num;
                    }
                }
                return { cd: cd, nm: nm };
            };

            Vue.onMounted(async () => {
                // 初期表示

                // 取得フィールド作成
                let fields = [];
                let items = [];
                const keys = Object.keys(CONF).filter((key) => key !== 'apps');
                const cd = PATTERN_NAME_ITEMS.map((item) => item.cd);
                console.log('keys:', keys);
                keys.forEach((key) => {
                    CONF[key].forEach((field) => {
                        //console.log(key, ':', field.code);
                        fields.push(field.code);
                        items.push({ code: field.code, label: field.label, type: field.type });
                        // パターン名項目の設定
                        if (cd.includes(field.code)) {
                            const index = PATTERN_NAME_ITEMS.findIndex((item) => item.cd === field.code);
                            if (index !== -1) {
                                PATTERN_NAME_ITEMS[index].label = field.label;
                                // CONFのstaffFieldsにはtypeがないので、空を設定
                                if (field.type === undefined) {
                                    PATTERN_NAME_ITEMS[index].type = '';
                                } else {
                                    PATTERN_NAME_ITEMS[index].type = field.type;
                                }
                            }
                        }
                    });
                });

                // 項目名の設定
                STATE.listData = { items: items };
                STATE.filters = items.reduce((acc, item) => {
                    //acc[item.code] = item.label;
                    acc[item.code] = '';
                    return acc;
                }, {});

                // id revision追加
                fields.push(EXCEPT_ITEMS[0]);
                fields.push(EXCEPT_ITEMS[1]);

                let itemCount = 0; // 余分な項目をカウント
                //let staffCount = 0;
                // 担当者コード　副担当者コードがない場合は追加
                if (fields.indexOf(PATTERN_NAME_ITEMS[1].cd) === -1) {
                    fields.push(PATTERN_NAME_ITEMS[1].cd);
                    //PATTERN_NAME_ITEMS[1].visible = false;
                    PATTERN_NAME_ITEMS[1].label = PATTERN_NAME_ITEMS[1].cd;
                } else {
                    //PATTERN_NAME_ITEMS[1].visible = true;
                    itemCount++;
                }
                if (fields.indexOf(PATTERN_NAME_ITEMS[3].cd) === -1) {
                    fields.push(PATTERN_NAME_ITEMS[3].cd);
                    // PATTERN_NAME_ITEMS[3].visible = false;
                    PATTERN_NAME_ITEMS[3].label = PATTERN_NAME_ITEMS[3].cd;
                } else {
                    //PATTERN_NAME_ITEMS[3].visible = true;
                    itemCount++;
                }
                STATE.listData.items.push({ code: SELECTTYPE_NAME_ITEMS[0].cd, label: SELECTTYPE_NAME_ITEMS[0].label, type: '' });
                STATE.listData.items.push({ code: SELECTTYPE_NAME_ITEMS[1].cd, label: SELECTTYPE_NAME_ITEMS[1].label, type: '' });
                STATE.filters[SELECTTYPE_NAME_ITEMS[0].cd] = '';
                STATE.filters[SELECTTYPE_NAME_ITEMS[1].cd] = '';
                //const orderby = SUM_FIELDCD.year.cd + ' asc, ' + SUM_FIELDCD.month.cd + ' asc';
                // 担当者　副担当者　が選択されていた場合
                let count = fields.filter((field) => field === PATTERN_NAME_ITEMS[2].cd).length;
                if (count > 1) {
                    itemCount++;
                }
                count = fields.filter((field) => field === PATTERN_NAME_ITEMS[4].cd).length;
                if (count > 1) {
                    itemCount++;
                }

                // 顧客コード　顧客名　は必ず追加
                if (fields.indexOf(PATTERN_NAME_ITEMS[5].cd) === -1) {
                    fields.push(PATTERN_NAME_ITEMS[5].cd);
                    PATTERN_NAME_ITEMS[5].label = PATTERN_NAME_ITEMS[5].cd;
                } else {
                    itemCount++;
                }

                if (fields.indexOf(PATTERN_NAME_ITEMS[6].cd) === -1) {
                    fields.push(PATTERN_NAME_ITEMS[6].cd);
                    PATTERN_NAME_ITEMS[6].label = PATTERN_NAME_ITEMS[6].cd;
                } else {
                    itemCount++;
                }
                STATE.listData.items.push({ code: SELECTTYPE_NAME_ITEMS[2].cd, label: SELECTTYPE_NAME_ITEMS[2].label, type: '' });
                STATE.filters[SELECTTYPE_NAME_ITEMS[2].cd] = '';
                //console.log('fields:', fields);

                // 担当者所属　副担当者所属　は必ず追加
                if (fields.indexOf(ORG_ITEM[0]) === -1) {
                    fields.push(ORG_ITEM[0]);
                } else {
                    itemCount++;
                }
                if (fields.indexOf(ORG_ITEM[1]) === -1) {
                    fields.push(ORG_ITEM[1]);
                } else {
                    itemCount++;
                }
                PATTERN_NAME_ITEMS[7].label = PATTERN_NAME_ITEMS[7].cd;
                PATTERN_NAME_ITEMS[8].label = PATTERN_NAME_ITEMS[8].cd;
                PATTERN_NAME_ITEMS[9].label = PATTERN_NAME_ITEMS[9].cd;
                PATTERN_NAME_ITEMS[10].label = PATTERN_NAME_ITEMS[10].cd;
                STATE.listData.items.push({ code: SELECTTYPE_NAME_ITEMS[3].cd, label: SELECTTYPE_NAME_ITEMS[3].label, type: '' });
                STATE.listData.items.push({ code: SELECTTYPE_NAME_ITEMS[4].cd, label: SELECTTYPE_NAME_ITEMS[4].label, type: '' });
                STATE.filters[SELECTTYPE_NAME_ITEMS[3].cd] = '';
                STATE.filters[SELECTTYPE_NAME_ITEMS[4].cd] = '';
                //console.log('fields:', fields);

                // 項目の並び順を変更する
                // 「顧客名」「担当者」「担当者所属」「副担当者」「副担当者所属」の順序にし、それ以外はこの順序の後に表示する
                const orderKeys = SELECTTYPE_NAME_ITEMS.slice()
                    .sort((a, b) => a.index - b.index)
                    .map((item) => item.cd);
                STATE.listData.items = [...orderKeys.map((key) => STATE.listData.items.find((item) => item.code === key)).filter(Boolean), ...STATE.listData.items.filter((item) => !orderKeys.includes(item.code))];

                // レコード取得
                try {
                    const records = await getRecords(fields, '', '', utils.constants.CUSTOMER_APP_ID);
                    //const items = Object.keys(records[0]).filter((item) => !EXCEPT_ITEMS.includes(item));
                    let items = [];
                    let i = 0;
                    records.forEach((rec) => {
                        items.push({ datas: {} });
                        STATE.listData.items.forEach((item) => {
                            //console.log(item.label);
                            if (utils.common.containsKey(rec, item.code)) {
                                //items[i].datas[item.label] = { value: rec[item.label].value };
                                if (Array.isArray(rec[item.code].value) && rec[item.code].value.length === 0) {
                                    // 配列が空だった場合
                                    items[i].datas[item.code] = '';
                                } else {
                                    items[i].datas[item.code] = rec[item.code].value;
                                }
                                //console.log(item.code, ':', rec[item.code].value);
                            } else {
                                //items[i].datas[item.label] = { value: '' };
                                items[i].datas[item.code] = '';
                            }
                        });
                        // id 追加
                        items[i].datas[EXCEPT_ITEMS[0]] = rec[EXCEPT_ITEMS[0]].value;

                        // 担当者コード　副担当者コードがなかった場合、追加
                        //if (!PATTERN_NAME_ITEMS[1].visible) {
                        items[i].datas[PATTERN_NAME_ITEMS[1].cd] = rec[PATTERN_NAME_ITEMS[1].cd].value;
                        //}
                        //if (!PATTERN_NAME_ITEMS[3].visible) {
                        items[i].datas[PATTERN_NAME_ITEMS[3].cd] = rec[PATTERN_NAME_ITEMS[3].cd].value;
                        //}

                        // 担当者・副担当者・顧客名の[コード] 名称を追加
                        let wkcode = rec[PATTERN_NAME_ITEMS[1].cd]?.value ?? '';
                        let wkname = rec[PATTERN_NAME_ITEMS[2].cd]?.value ?? '';
                        if (wkcode !== '' && wkname !== '') {
                            items[i].datas[SELECTTYPE_NAME_ITEMS[0].cd] = '[' + wkcode + ']' + wkname;
                        } else {
                            items[i].datas[SELECTTYPE_NAME_ITEMS[0].cd] = '';
                        }

                        // 副担当者
                        wkcode = rec[PATTERN_NAME_ITEMS[3].cd]?.value ?? '';
                        wkname = rec[PATTERN_NAME_ITEMS[4].cd]?.value ?? '';
                        if (wkcode !== '' && wkname !== '') {
                            items[i].datas[SELECTTYPE_NAME_ITEMS[1].cd] = '[' + wkcode + ']' + wkname;
                        } else {
                            items[i].datas[SELECTTYPE_NAME_ITEMS[1].cd] = '';
                        }

                        // 顧客名
                        wkcode = rec[PATTERN_NAME_ITEMS[5].cd]?.value ?? '';
                        wkname = rec[PATTERN_NAME_ITEMS[6].cd]?.value ?? '';
                        if (wkcode !== '' && wkname !== '') {
                            items[i].datas[SELECTTYPE_NAME_ITEMS[2].cd] = '[' + wkcode + ']' + wkname;
                            items[i].datas[PATTERN_NAME_ITEMS[5].cd] = wkcode;
                            items[i].datas[PATTERN_NAME_ITEMS[6].cd] = wkname;
                        } else {
                            items[i].datas[SELECTTYPE_NAME_ITEMS[2].cd] = '';
                            items[i].datas[PATTERN_NAME_ITEMS[5].cd] = '';
                            items[i].datas[PATTERN_NAME_ITEMS[6].cd] = '';
                        }

                        // 担当者所属
                        if (utils.common.containsKey(rec, ORG_ITEM[0]) && Array.isArray(rec[ORG_ITEM[0]].value) && rec[ORG_ITEM[0]].value.length > 0) {
                            wkcode = rec[ORG_ITEM[0]].value[0].code;
                            wkname = rec[ORG_ITEM[0]].value[0].name;
                        } else {
                            wkcode = '';
                            wkname = '';
                        }
                        items[i].datas[PATTERN_NAME_ITEMS[7].cd] = wkcode; // 所属はコード
                        items[i].datas[PATTERN_NAME_ITEMS[8].label] = wkname; // 所属は名称
                        if (wkcode !== '' && wkname !== '') {
                            items[i].datas[SELECTTYPE_NAME_ITEMS[3].cd] = '[' + wkcode + ']' + wkname;
                        } else {
                            items[i].datas[SELECTTYPE_NAME_ITEMS[3].cd] = '';
                        }
                        // 副担当者所属
                        if (utils.common.containsKey(rec, ORG_ITEM[1]) && Array.isArray(rec[ORG_ITEM[1]].value) && rec[ORG_ITEM[1]].value.length > 0) {
                            wkcode = rec[ORG_ITEM[1]].value[0].code;
                            wkname = rec[ORG_ITEM[1]].value[0].name;
                        } else {
                            wkcode = '';
                            wkname = '';
                        }
                        items[i].datas[PATTERN_NAME_ITEMS[9].cd] = wkcode; // 所属はコード
                        items[i].datas[PATTERN_NAME_ITEMS[10].label] = wkname; // 所属は名称
                        if (wkcode !== '' && wkname !== '') {
                            items[i].datas[SELECTTYPE_NAME_ITEMS[4].cd] = '[' + wkcode + ']' + wkname;
                        } else {
                            items[i].datas[SELECTTYPE_NAME_ITEMS[4].cd] = '';
                        }

                        i++;
                    });
                    STATE.listData.datas = items;
                    STATE.itemLength = STATE.listData.items.length - itemCount - 2;
                    // 各配列の末尾に担当者・副担当者データを追加
                    /*STATE.listData.datas.forEach((item) => {
                        if (item.datas['担当者'] !== undefined) {
                            item.datas['担当者'] = item.datas['担当者'];
                        }
                        if (item.datas['副担当者'] !== undefined) {
                            item.datas['元副担当者'] = item.datas['副担当者'];
                        }
                    });*/
                    console.log('records:', records);
                } catch (e) {
                    console.log('項目取得失敗！:onMounted:', e);
                }

                // 担当者取得
                //const wk = await utils.common.getFieldMap(utils.constants.STAFF_APP_ID);
                //console.log('wk:', wk);
                try {
                    const staffs = await getRecords('', '', '', utils.constants.STAFF_APP_ID);
                    if (staffs.length !== 0) {
                        // 担当者　所属
                        // STAFFMASTER_FIELDに対応するデータを取得
                        const filtered = Object.fromEntries(Object.entries(STAFFMASTER_FIELD).filter(([key]) => key !== 'id' && key !== 'revision'));
                        STATE.selectStaffs = staffs.map((staffRec) => {
                            const obj = {};
                            Object.entries(filtered).forEach((key) => {
                                obj[key[1].cd] = staffRec[key[1].cd].value;
                            });
                            obj[STAFFMASTER_FIELD.id.readCd] = staffRec[STAFFMASTER_FIELD.id.readCd].value;
                            obj[STAFFMASTER_FIELD.revision.readCd] = staffRec[STAFFMASTER_FIELD.revision.readCd].value;
                            return obj;
                        });

                        // 所属
                    } else {
                        console.log('staffsデータがありません');
                    }

                    // テスト用データ
                    STATE.listData.datas.push({
                        datas: {
                            顧客コード: '999',
                            顧客コード名: '[999]顧客テスト１',
                            顧客名: '顧客テスト１',
                            担当者コード: '99999',
                            担当者: 'テスト太郎',
                            担当者コード名: '[99999]テスト太郎',
                            担当者所属: 'テスト部',
                            担当者所属コード: '99999',
                            担当者所属コード名: '[99999]テスト部',
                            副担当者コード: '99999',
                            副担当者: 'テスト太郎',
                            副担当者コード名: '[99999]テスト太郎',
                            副担当者所属: 'テスト部',
                            副担当者所属コード: '99999',
                            副担当者所属コード名: '[99999]テスト部',
                        },
                    });
                    STATE.listData.datas.push({
                        datas: {
                            顧客コード: '998',
                            顧客コード名: '[998]顧客テスト２',
                            顧客名: '顧客テスト２',
                            担当者コード: '99998',
                            担当者: 'テスト花子',
                            担当者コード名: '[99998]テスト花子',
                            担当者所属: 'テスト２部',
                            担当者所属コード: '99998',
                            担当者所属コード名: '[99998]テスト２部',
                            副担当者コード: '99998',
                            副担当者: 'テスト花子',
                            副担当者コード名: '[99998]テスト花子',
                            副担当者所属: 'テスト２部',
                            副担当者所属コード: '99998',
                            副担当者所属コード名: '[99998]テスト２部',
                        },
                    });
                    //STATE.listData.datas[0].datas.担当者コード = '99999'; // テスト用
                    //STATE.listData.datas[0].datas.担当者 = 'テスト太郎'; // テスト用
                    //}
                } catch (e) {
                    console.log('担当者取得失敗！:onMounted:', e);
                }
                console.log('STATE:', STATE);
            });

            return {
                STATE,
                CONF,
                selectedStaffName,
                customFilter,
                addPattern,
                openPattern,
                filteredRows,
                getUniqueOptions,
                getStaffList,
                setNewLabel,
                //makeNewItemName,
                isVisibleItem,
                //isVisibleLabel,
                isSelectType,
                isSelectData,
                //getSelectedStaff,
                //setSelectVmodel,
                changeStaff,
                savePattern,
                replaceAllPattern,
                applyCustomerChartPattern,
                //patternName,
                setTitleBackColor,
                setItemBackColor,
            };
        },
        template: /* HTML */ `
            <ul>
                <li>顧客一覧のテーブル（tableFieldsのフィールド）と担当者フィールド（staffFieldのフィールド）</li>
                <li>選択したパターンの担当者（staffFieldの分だけ用意）</li>
                <li>現在と表示中パターンの担当者の顧客数・所属組織の顧客数※複数組織に所属している場合は要検討</li>
                <li>適用した際は必ず適用日時と適用前のバックアップを取得・JSONに保存</li>
            </ul>
            <div id="bz_header">
                <button @click="addPattern" class="bz_bt_def">パターン追加</button>
                <button @click="openPattern" class="bz_bt_def">パターン開く</button>
            </div>
            <div id="bz_events_main_container">
                <table class="bz_table_def">
                    <thead>
                        <pattern-set @savePattern="savePattern" @replaceAllPattern="replaceAllPattern" @applyCustomerChartPattern="applyCustomerChartPattern" :pattern="STATE.patternNames.names" :colspan="STATE.itemLength?STATE.itemLength:0" />

                        <tr>
                            <!--{{STATE.listData.items?STATE.listData.items.length:''}}:{{STATE.listData.items?STATE.patternNames.len:''}}-->
                            <template v-for="field in STATE.listData.items" :key="field">
                                <th v-if="isVisibleItem(field.code)" :style="{backgroundColor:setTitleBackColor(field.code)}">
                                    <div>{{ setNewLabel(field.label) }}</div>
                                    <div>
                                        <!-- 追加したあと、データにすべてを設定する -->
                                        <template v-if="!(isSelectType(field.label))">
                                            <input type="text" v-model="STATE.filters[field.code]" />
                                        </template>
                                        <template v-else>
                                            <select v-model="STATE.filters[field.code]">
                                                <option value="">すべて</option>
                                                <option v-for="option in getUniqueOptions(field.code)" :key="option.value" :value="option.value">{{ option.label }}</option>
                                                <option value="__EMPTY__">未設定</option>
                                            </select>
                                        </template>
                                    </div>
                                </th>
                            </template>
                        </tr>
                    </thead>

                    <tbody>
                        <template v-for="(field,index) in filteredRows" :key="field">
                            <tr>
                                <template v-for="(key,itemIndex) in STATE.listData.items" :key="key">
                                    <td v-if="isVisibleItem(key.code)" :style="{backgroundColor:setItemBackColor(key.code,field.datas)}">
                                        <!--{{key.code + '_' + 'vmodel'}}:{{setNo(itemIndex,key.code)}}:{{key.code+'_'+index}}:{{index}}-->
                                        <!--test:{{isSelectData(key.code)}}:{{key.code}}-->
                                        <!--{{makeNewItemName(key.code)!==''?makeNewItemName(key.code).nm:''}}:-->
                                        <template v-if="isSelectData(key.code)">
                                            <select v-model="field.datas[key.code + '_' + 'vmodel']" @change="changeStaff(field.datas.$id,$event,key.code)">
                                                <!--(index-STATE.itemLength<=1?'1':'2')-->
                                                <!--:filter="customFilter"-->
                                                <!--<option v-for="staff in getSelectedStaff(key.code)" :key="staff" :value="staff">{{ staff }}</option>-->
                                                <option v-for="option in getUniqueOptions(key.code)" :key="option.value" :value="option.label">{{ option.label}}</option>
                                                <option value="">未設定</option>
                                            </select>
                                        </template>
                                        <template v-else> {{field.datas[key.code]}} </template>
                                    </td>
                                </template>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>

            <div>
                CONF：
                <pre>{{ CONF }}</pre>
            </div>
            <div style="margin:20px 0;">
                V-selectの例
                <v-select :options="STATE.testData" label="name" v-model="STATE.testSelectedStaff" :filter="customFilter">
                    <template v-slot:no-options="{ search, searching }">
                        <div>担当者が見つかりません</div>
                    </template>
                    <template #option="{ code,name }">
                        <div>［{{ code }}］{{ name }}</div>
                    </template>
                </v-select>
                <div style="margin:20px 0;">選択中コード：{{ STATE.testSelectedStaff?.code }}</div>
                <div style="margin:20px 0;">選択中担当者object：{{ STATE.testSelectedStaff }}</div>
            </div>
        `,
    };

    kintone.events.on('app.record.index.show', function (e) {
        const CONTAINER = document.querySelector(CONTAINER_ID);
        if (!CONTAINER) {
            return e;
        }

        if (!CONFDATA.CONFIG_DATA) {
            Swal.fire({
                icon: 'error',
                title: '設定エラー',
                text: '担当者変更プラグインが未設定です。設定を行ってください。',
            });
            return e;
        }

        const VUE_APP = Vue.createApp(APP);
        VUE_APP.mount(CONTAINER);

        return e;
    });
})(kintone.$PLUGIN_ID);
