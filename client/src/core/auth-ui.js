// ==================== 登录/注册系统 ====================
const AUTH_KEYS = {
  USERS: 'xundao_users',
  CURRENT_USER: 'xundao_current_user',
  SESSION: 'xundao_session'
};

// 获取用户列表
function getUsers() {
  const users = localStorage.getItem(AUTH_KEYS.USERS);
  return users ? JSON.parse(users) : {};
}

// 保存用户列表
function saveUsers(users) {
  localStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(users));
}

// 获取当前登录用户
function getCurrentUser() {
  const user = localStorage.getItem(AUTH_KEYS.CURRENT_USER);
  return user ? JSON.parse(user) : null;
}

// 设置当前登录用户
function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(AUTH_KEYS.CURRENT_USER, JSON.stringify(user));
    // 保存会话
    const session = {
      userId: user.id,
      loginTime: Date.now()
    };
    localStorage.setItem(AUTH_KEYS.SESSION, JSON.stringify(session));
  } else {
    localStorage.removeItem(AUTH_KEYS.CURRENT_USER);
    localStorage.removeItem(AUTH_KEYS.SESSION);
  }
}

// 切换登录/注册标签
function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabs = document.querySelectorAll('.auth-tab');
  
  tabs.forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  
  if (tab === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    loginForm.style.animation = 'formFadeIn 0.4s ease-out';
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    registerForm.style.animation = 'formFadeIn 0.4s ease-out';
  }
}

// 密码显示/隐藏
function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
  } else {
    input.type = 'password';
  }
}

// 表单验证
function validateLoginForm() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  if (!username) {
    showFormError('loginUsername', '请输入用户名');
    return false;
  }
  if (!password) {
    showFormError('loginPassword', '请输入密码');
    return false;
  }
  return true;
}

function validateRegisterForm() {
  const username = document.getElementById('registerUsername').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;
  const agreeTerms = document.getElementById('agreeTerms').checked;
  
  if (!username) {
    showFormError('registerUsername', '请输入用户名');
    return false;
  }
  if (!/^[a-zA-Z0-9]{3,16}$/.test(username)) {
    showFormError('registerUsername', '用户名需3-16位字母数字');
    return false;
  }
  if (!password || password.length < 6) {
    showFormError('registerPassword', '密码需至少6位');
    return false;
  }
  if (password !== confirmPassword) {
    showFormError('registerConfirmPassword', '两次密码不一致');
    return false;
  }
  if (!agreeTerms) {
    alert('请阅读并同意用户协议');
    return false;
  }
  return true;
}

// 显示表单错误
function showFormError(inputId, message) {
  const inputWrapper = document.getElementById(inputId).parentElement;
  let errorEl = inputWrapper.querySelector('.form-error');
  if (!errorEl) {
    errorEl = document.createElement('div');
    errorEl.className = 'form-error';
    inputWrapper.appendChild(errorEl);
  }
  inputWrapper.classList.add('error');
  errorEl.textContent = message;
  
  // 3秒后自动清除
  setTimeout(() => {
    inputWrapper.classList.remove('error');
    errorEl.textContent = '';
  }, 3000);
}

// 处理登录
function handleLogin(event) {
  event.preventDefault();
  
  if (!validateLoginForm()) return;
  
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const rememberMe = document.getElementById('rememberMe').checked;
  
  const users = getUsers();
  const user = users[username];
  
  if (!user || user.password !== password) {
    showFormError('loginPassword', '用户名或密码错误');
    return;
  }
  
  // 登录成功
  setCurrentUser({
    id: user.id,
    username: user.username,
    email: user.email,
    loginTime: Date.now()
  });
  
  // 隐藏登录界面，显示加载界面
  document.getElementById('authContainer').classList.add('hidden');
  
  // 加载用户游戏数据
  loadUserGameData(user.id);
}

// 处理注册
function handleRegister(event) {
  event.preventDefault();
  
  if (!validateRegisterForm()) return;
  
  const username = document.getElementById('registerUsername').value.trim();
  const password = document.getElementById('registerPassword').value;
  const email = document.getElementById('registerEmail').value.trim();
  
  const users = getUsers();
  
  // 检查用户名是否已存在
  if (users[username]) {
    showFormError('registerUsername', '用户名已存在');
    return;
  }
  
  // 创建新用户
  const newUser = {
    id: 'user_' + Date.now(),
    username: username,
    password: password,
    email: email,
    createdAt: Date.now()
  };
  
  users[username] = newUser;
  saveUsers(users);
  
  // 自动登录
  setCurrentUser({
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    loginTime: Date.now()
  });
  
  // 隐藏登录界面，跳转到引导页面创建角色
  document.getElementById('authContainer').classList.add('hidden');
  window.location.href = 'guide.html';
}

// 加载用户游戏数据
function loadUserGameData(userId) {
  // 从 localStorage 加载游戏数据
  const savedData = localStorage.getItem('xundao_player');
  if (savedData) {
    try {
      const playerData = JSON.parse(savedData);
      if (playerData.userId === userId) {
        // 用户匹配，继续加载游戏
        window.onload();
        return;
      }
    } catch (e) {
      console.error('加载游戏数据失败:', e);
    }
  }
  // 没有数据或用户不匹配，跳转到引导页面（先隐藏loading）
  const loadingEl = document.getElementById('loadingOverlay');
  if (loadingEl) loadingEl.classList.add('hidden');
  window.location.href = 'guide.html';
}

// 第三方登录
function socialLogin(type) {
  const username = type + '_' + Date.now();
  const users = getUsers();
  
  let user = users[username];
  if (!user) {
    user = {
      id: 'user_' + Date.now(),
      username: username,
      password: '',
      email: '',
      loginType: type,
      createdAt: Date.now()
    };
    users[username] = user;
    saveUsers(users);
  }
  
  setCurrentUser({
    id: user.id,
    username: user.username,
    loginType: type,
    loginTime: Date.now()
  });
  
  // 检查是否有游戏数据
  const savedData = localStorage.getItem('xundao_player');
  if (savedData) {
    try {
      const playerData = JSON.parse(savedData);
      if (playerData && playerData.guide && playerData.guide.completed) {
        // 有游戏数据，直接进入游戏
        document.getElementById('authContainer').classList.add('hidden');
        window.onload();
        return;
      }
    } catch (e) {}
  }
  
  // 跳转到引导页面（先隐藏loading）
  const loadingEl = document.getElementById('loadingOverlay');
  if (loadingEl) loadingEl.classList.add('hidden');
  window.location.href = 'guide.html';
}

// 显示用户协议
function showTerms(event) {
  event.preventDefault();
  alert('用户协议\n\n欢迎使用寻道修仙！\n\n本游戏是一款休闲修仙游戏...');
}

// 显示隐私政策
function showPrivacy(event) {
  event.preventDefault();
  alert('隐私政策\n\n我们重视您的隐私...');
}

// 显示忘记密码
function showForgotPassword(event) {
  event.preventDefault();
  alert('忘记密码功能\n\n请联系游戏客服找回密码');
}

// 检查登录状态
function checkAuth() {
  const currentUser = getCurrentUser();
  const session = JSON.parse(localStorage.getItem(AUTH_KEYS.SESSION) || '{}');
  
  if (currentUser && session.userId) {
    // 已登录，隐藏登录界面
    document.getElementById('authContainer').classList.add('hidden');
    return true;
  }
  
  // 未登录，显示登录界面
  document.getElementById('authContainer').classList.remove('hidden');
  return false;
}

// 登出
function logout() {
  if (!confirm('确定要退出登录吗？')) return;
  
  setCurrentUser(null);
  
  // 重新显示登录界面
  document.getElementById('authContainer').classList.remove('hidden');
  switchAuthTab('login');
}

