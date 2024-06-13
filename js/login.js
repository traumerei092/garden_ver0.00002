// Your web app's Firebase configuration
const firebaseConfig = {
    
    authDomain: "myfirebaseproject-64ce9.firebaseapp.com",
    projectId: "myfirebaseproject-64ce9",
    storageBucket: "myfirebaseproject-64ce9.appspot.com",
    messagingSenderId: "733587712532",
    appId: "1:733587712532:web:76e259c04d29703e9ed501"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase Authの取得
const auth = firebase.auth();
// Firestoreの初期化
const db = firebase.firestore();

$(function () {
    // Firebase Authenticationのセッション持続性を設定
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => {
            console.log("Persistence set to LOCAL");
        })
        .catch((error) => {
            console.error("Error setting persistence:", error);
        });
    
    // サインアップ処理
    $('#signup-form').on('submit', function (e) {
        e.preventDefault();

        const name = $('#signup-name').val();
        const id = $('#signup-id').val();
        const email = $('#signup-email').val();
        const password = $('#signup-password').val();

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                // Firestoreに追加情報を保存
                return db.collection('users').doc(user.uid).set({
                    name: name,
                    id: id,
                    email: email
                });
            })
            .then(() => {
                $('#auth-status').text('User signed up successfully');
                console.log('User signed up successfully');
                // マイページにリダイレクト
                window.location.href = 'mypage.html?uid=' + auth.currentUser.uid;
            })
            .catch((error) => {
                $('#auth-status').text('Error signing up: ' + error.message).css('color', 'red');
                console.error('Error signing up:', error);
            });
    });

    // ログイン処理
    $('#login-form').on('submit', function (e) {
        e.preventDefault();

        const email = $('#login-email').val();
        const password = $('#login-password').val();

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                $('#auth-status').text('User logged in successfully: ' + userCredential.user.email);
                console.log('User logged in successfully:', userCredential.user);
                // マイページにリダイレクト
                window.location.href = 'mypage.html?uid=' + userCredential.user.uid;
            })
            .catch((error) => {
                $('#auth-status').text('Error logging in: ' + error.message).css('color', 'red');
                console.error('Error logging in:', error);
            });
    });
});