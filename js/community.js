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
const auth = firebase.auth();
const db = firebase.firestore();

$(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const uid = urlParams.get('uid');

    $('#back-button').on('click', function() {
        window.location.href = `mypage.html?uid=${uid}`;
    });


    if (uid) {
        auth.onAuthStateChanged((user) => {
            if (user && user.uid === uid) {
                // Firestoreからユーザー情報を取得
                db.collection('users').doc(uid).get().then((doc) => {
                    if (doc.exists) {
                        const userData = doc.data();
                        $('#user-info').text(`Welcome, ${userData.id} !`);
                    } else {
                        console.error('No such document!');
                        window.location.href = 'index.html';
                    }
                }).catch((error) => {
                    console.error('Error getting document:', error);
                    window.location.href = 'index.html';
                });
            } else {
                window.location.href = 'index.html';
            }
        });
    } else {
        window.location.href = 'index.html';
    }

    /**
     * #create-community-formのサブミットイベント
     * コミュニティを作成し、Firestoreに保存する
     * コミュニティの作成が成功したら、mypage.htmlにリダイレクトする
     */
    $('#create-community-form').on('submit', function(e) {
        e.preventDefault();

        const communityName = $('#community-name').val();
        const communityDescription = $('#community-description').val();
        const user = auth.currentUser;

        if (user) {
            db.collection('communities').add({
                name: communityName,
                description: communityDescription,
                creator: user.uid,
                members: [user.uid],
                talkRooms: []
            })
            .then((docRef) => {
                $('#create-community-status').text('Community created successfully');
                console.log('Community created with ID:', docRef.id);
                return db.collection('users').doc(user.uid).update({
                    joinedCommunities: firebase.firestore.FieldValue.arrayUnion(docRef.id)
                });
            })
            .then(() => {
                // コミュニティの作成が成功したらmypage.htmlにリダイレクト
                window.location.href = `mypage.html?uid=${uid}`;
            })
            .catch((error) => {
                $('#create-community-status').text('Error creating community: ' + error.message).css('color', 'red');
                console.error('Error creating community:', error);
            });
        } else {
            $('#create-community-status').text('You must be logged in to create a community').css('color', 'red');
        }
    });
});
