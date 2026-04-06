// components/quick-actions/quick-actions.js
const { RECORD_TYPE_CONFIG } = require('../../utils/constants')

Component({
  properties: {},
  data: {
    actions: Object.keys(RECORD_TYPE_CONFIG).map(key => ({
      type: key,
      label: RECORD_TYPE_CONFIG[key].label,
      icon: RECORD_TYPE_CONFIG[key].icon,
      color: RECORD_TYPE_CONFIG[key].color,
      bgColor: RECORD_TYPE_CONFIG[key].bgColor
    }))
  },
  methods: {
    onTap(e) {
      const type = e.currentTarget.dataset.type
      wx.navigateTo({
        url: `/pages/add-record/add-record?type=${type}`
      })
    }
  }
})
