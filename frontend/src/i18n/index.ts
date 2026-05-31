import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  'zh-CN': {
    translation: {
      app: {
        title: 'Firefly - 社区安全平台',
        subtitle: '守护流浪动物，共建安全社区',
      },
      nav: {
        map: '地图',
        submit: '提交标记',
        profile: '个人中心',
      },
      marker: {
        categories: {
          abuse: '虐待举报',
          poison: '投毒事件',
          trap: '陷阱警告',
          theft: '盗窃事件',
          missing_pet: '走失宠物',
          suspicious_vehicle: '可疑车辆',
          station: '救助站',
          food_bank: '喂食点',
          friendly_clinic: '友好诊所',
          helper: '爱心人士',
          trap_support: '诱捕支持',
        },
        submit: '提交标记',
        title: '标题',
        description: '描述',
        address: '地址',
        category: '分类',
        location: '位置',
        contactInfo: '联系方式',
      },
      feedback: {
        confirm: '确认',
        dispute: '质疑',
        support: '支持',
        resolved: '已解决',
        still_active: '仍在发生',
        outdated: '已过时',
        helpful: '有帮助',
        not_helpful: '无帮助',
      },
      common: {
        submit: '提交',
        cancel: '取消',
        loading: '加载中...',
        error: '错误',
        success: '成功',
      },
    },
  },
  en: {
    translation: {
      app: {
        title: 'Firefly - Community Safety Platform',
        subtitle: 'Protecting stray animals, building safe communities',
      },
      nav: {
        map: 'Map',
        submit: 'Submit',
        profile: 'Profile',
      },
      marker: {
        categories: {
          abuse: 'Abuse Report',
          poison: 'Poisoning',
          trap: 'Trap Warning',
          theft: 'Theft',
          missing_pet: 'Missing Pet',
          suspicious_vehicle: 'Suspicious Vehicle',
          station: 'Rescue Station',
          food_bank: 'Feeding Point',
          friendly_clinic: 'Friendly Clinic',
          helper: 'Helper',
          trap_support: 'Trap Support',
        },
        submit: 'Submit Marker',
        title: 'Title',
        description: 'Description',
        address: 'Address',
        category: 'Category',
        location: 'Location',
        contactInfo: 'Contact Info',
      },
      feedback: {
        confirm: 'Confirm',
        dispute: 'Dispute',
        support: 'Support',
        resolved: 'Resolved',
        still_active: 'Still Active',
        outdated: 'Outdated',
        helpful: 'Helpful',
        not_helpful: 'Not Helpful',
      },
      common: {
        submit: 'Submit',
        cancel: 'Cancel',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
      },
    },
  },
  hi: {
    translation: {
      app: {
        title: 'Firefly - सामुदायिक सुरक्षा मंच',
        subtitle: 'आवारा जानवरों की रक्षा, सुरक्षित समुदाय का निर्माण',
      },
      nav: {
        map: 'नक्शा',
        submit: 'जमा करें',
        profile: 'प्रोफ़ाइल',
      },
      marker: {
        categories: {
          abuse: 'दुर्व्यवहार रिपोर्ट',
          poison: 'जहर',
          trap: 'जाल चेतावनी',
          theft: 'चोरी',
          missing_pet: 'खोया हुआ पालतू',
          suspicious_vehicle: 'संदिग्ध वाहन',
          station: 'बचाव केंद्र',
          food_bank: 'भोजन बिंदु',
          friendly_clinic: 'मित्रवत क्लिनिक',
          helper: 'सहायक',
          trap_support: 'जाल समर्थन',
        },
        submit: 'मार्कर जमा करें',
        title: 'शीर्षक',
        description: 'विवरण',
        address: 'पता',
        category: 'श्रेणी',
        location: 'स्थान',
        contactInfo: 'संपर्क जानकारी',
      },
      feedback: {
        confirm: 'पुष्टि करें',
        dispute: 'विवाद',
        support: 'समर्थन',
        resolved: 'हल हो गया',
        still_active: 'अभी भी सक्रिय',
        outdated: 'पुराना',
        helpful: 'सहायक',
        not_helpful: 'सहायक नहीं',
      },
      common: {
        submit: 'जमा करें',
        cancel: 'रद्द करें',
        loading: 'लोड हो रहा है...',
        error: 'त्रुटि',
        success: 'सफलता',
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'zh-CN',
  fallbackLng: 'zh-CN',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
