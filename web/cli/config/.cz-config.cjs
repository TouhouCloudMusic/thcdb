// prettier-ignore
module.exports = {
    types: [
        { value: "add"      , name: "add:      Add new stuff                                                \n            添加" },
        { value: "fix"      , name: "fix:      A bug fix                                                    \n            修复" },
        { value: "remove"   , name: "remove:   Remove something                                             \n            移除" },
        { value: "refactor" , name: "refactor: A code change that neither fixes a bug nor adds a feature    \n            重构" },
        { value: "format"   , name: "format:   Changes that do not affect the meaning of the code           \n            (white-space, formatting, missing semi-colons, etc)      \n            格式" },
        { value: "doc"      , name: "doc:      Documentation only changes                                   \n            文档" },
        { value: "revert"   , name: "revert:   Revert to a previous commit                                  \n            回退" },
        { value: "wip"      , name: "wip:      Work in progress                                             \n            未完成" },
        // { value: "test"     , name: "test:     Added or modify tests                                        \n            测试" },
        // { value: "build"    , name: "build:    Changes that affect the build system or external dependencies\n            (example scopes: gulp, broccoli, npm)                    \n            构建工具与依赖" },
        // { value: "ci"       , name: "ci:       Changes to our CI configuration files and scripts            \n            (example scopes: Travis, Circle, BrowserStack, SauceLabs)\n            持续整合工具" },
        // { value: "chore"    , name: "chore:    Other changes that don't modify src or test files            \n            杂项" },

    ],

    scopes: [
       "page",
       "style",
       "util",
       "test",
    ],

    usePreparedCommit: false, // to re-use commit from ./.git/COMMIT_EDITMSG
    allowTicketNumber: false,
    isTicketNumberRequired: false,
    ticketNumberPrefix: "TICKET-",
    ticketNumberRegExp: "\\d{1,5}",

    // it needs to match the value for field type. Eg.: 'fix'

    scopeOverrides: {

    },

    // override the messages, defaults are as follows
    messages: {
        type: "Select the type of change that you're committing:\n",
        scope: "\nDenote the SCOPE of this change (optional):\n",
        // used if allowCustomScopes is true
        customScope: "Denote the SCOPE of this change:\n",
        subject: "Write a SHORT, IMPERATIVE tense description of the change:\n",
        body: 'Provide a LONGER description of the change (optional). Use "|" to break new line:\n',
        breaking: "List any BREAKING CHANGES (optional):",
        footer: "List any ISSUES CLOSED by this change (optional). E.g.: #31, #34:\n",
        confirmCommit:
            "Are you sure you want to proceed with the commit above?",
    },

    allowCustomScopes: true,
    allowBreakingChanges: ["add", "fix", "remove"],
    // skip any questions you want
    skipQuestions: ['scope'],

    // limit subject length
    subjectLimit: 100,
    skipEmptyScopes: true,
    // breaklineChar: '|', // It is supported for fields body and footer.
    // footerPrefix : 'ISSUES CLOSED:'
    // askForBreakingChangeFirst : true, // default is false
}
