const firebaseConfig = {
    
    authDomain: "myfirebaseproject-64ce9.firebaseapp.com",
    projectId: "myfirebaseproject-64ce9",
    storageBucket: "myfirebaseproject-64ce9.appspot.com",
    messagingSenderId: "733587712532",
    appId: "1:733587712532:web:76e259c04d29703e9ed501"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

$(document).ready(function () {
    const urlParams = new URLSearchParams(window.location.search);
    const communityId = urlParams.get('communityId');
    const uid = urlParams.get('uid');

    console.log("URL Params:", { communityId, uid });

    $('#back-button').on('click', function() {
        window.location.href = `mypage.html?uid=${uid}`;
    });

    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log('User authenticated:', user.uid);
            if (user.uid === uid) {
                db.collection('users').doc(uid).get().then((userDoc) => {
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        $('#user-info').text(`Welcome, ${userData.id} !`);

                        db.collection('communities').doc(communityId).get().then((doc) => {
                            if (doc.exists) {
                                const communityData = doc.data();
                                $('#community-name').text(`Community: ${communityData.name}`);
                                loadTalkRooms(communityId);
                                loadCommunityMembers(communityId); // メンバーを読み込む
                            } else {
                                console.error('No such community document!');
                                window.location.href = 'mypage.html?uid=' + uid;
                            }
                        }).catch((error) => {
                            console.error('Error getting community document:', error);
                            window.location.href = 'mypage.html?uid=' + uid;
                        });
                    } else {
                        console.error('No such user document!');
                        window.location.href = 'index.html';
                    }
                }).catch((error) => {
                    console.error('Error getting user document:', error);
                    window.location.href = 'index.html';
                });
            } else {
                console.error('UID does not match');
                window.location.href = 'index.html';
            }
        } else {
            console.error('User not authenticated');
            // ここで再度ログインページにリダイレクト
            window.location.href = 'index.html';
        }
    });

    $('.tab-button').on('click', function () {
        $('.tab-button').removeClass('active');
        $(this).addClass('active');

        const tab = $(this).data('tab');
        $('.tab-content').hide();
        $('#' + tab).show();

        if (tab === 'talk-rooms') {
            $('#create-talkroom-button').show();
            $('#invite-member-button').hide();
            $('#talk-room-history').show();
            $('#community-member-info').hide();
            $('#message-input-container').show();
            $('#travel-form').hide();
            $('#party-form').hide();
        } else {
            $('#create-talkroom-button').hide();
            $('#invite-member-button').show();
            $('#talk-room-history').hide();
            $('#community-member-info').show();
            $('#message-input-container').hide();
            $('#travel-form').hide();
            $('#party-form').hide();
        }
    });

    $('#create-talkroom-button').on('click', function () {
        console.log('Create Talk Room button clicked');
        const talkRoomName = prompt("Enter talk room name:");
        if (talkRoomName) {
            createTalkRoom(communityId, talkRoomName);
        }
    });

    $('#invite-member-button').on('click', function () {
        console.log('Invite New Member button clicked');
        const memberEmail = prompt("Enter new member's email:");
        if (memberEmail) {
            inviteNewMember(communityId, memberEmail);
        }
    });

    $('#send-message-button').on('click', function () {
        const messageText = $('#message-input').val();
        const talkRoomId = $('#talk-room-history').data('talk-room-id');
        if (messageText && talkRoomId) {
            sendMessage(communityId, talkRoomId, messageText, uid);
            $('#message-input').val(''); // メッセージ送信後に入力欄をクリア
        }
    });

    function loadTalkRooms(communityId) {
        console.log('Loading talk rooms for community:', communityId);
        db.collection('communities').doc(communityId).collection('talkRooms').get().then((querySnapshot) => {
            $('#talk-rooms').empty();
            querySnapshot.forEach((doc) => {
                const talkRoomData = doc.data();
                $('#talk-rooms').append(`
                    <div class="talk-room-item" data-id="${doc.id}">
                        <button>${talkRoomData.name}</button>
                    </div>
                `);
            });

            $('.talk-room-item').off('click').on('click', function () {
                const talkRoomId = $(this).data('id');
                loadTalkRoomHistory(communityId, talkRoomId);
            });
        }).catch((error) => {
            console.error('Error loading talk rooms:', error);
        });
    }

    function loadTalkRoomHistory(communityId, talkRoomId) {
        console.log('Loading talk room history for talk room:', talkRoomId);
        db.collection('communities').doc(communityId).collection('talkRooms').doc(talkRoomId).get().then((doc) => {
            if (doc.exists) {
                const talkRoomData = doc.data();
                $('#talk-room-name').text(talkRoomData.name);
            }
        }).catch((error) => {
            console.error('Error getting talk room document:', error);
        });
        db.collection('communities')
        .doc(communityId)
        .collection('talkRooms')
        .doc(talkRoomId)
        .collection('talks')
        .orderBy('timestamp')
        .get()
        .then((querySnapshot) => {
            $('#talk-room-history').empty();
            $('#talk-room-history').data('talk-room-id', talkRoomId); // talk-room-historyにtalk-room-idをセット
            querySnapshot.forEach((doc) => {
                const messageData = doc.data();
                const messageClass = messageData.sender === uid ? 'sent' : 'received';
                $('#talk-room-history').append(`
                    <div class="message ${messageClass}">
                        <p>${messageData.text}</p>
                    </div>
                `);
            });
        }).catch((error) => {
            console.error('Error loading talk room history:', error);
    });
}

    function sendMessage(communityId, talkRoomId, messageText, senderId) {
        console.log('Sending message:', messageText);
        db.collection('communities').doc(communityId).collection('talkRooms').doc(talkRoomId).collection('talks').add({
            text: messageText,
            sender: senderId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then((docRef) => {
            console.log('Message sent with ID:', docRef.id);
            loadTalkRoomHistory(communityId, talkRoomId); // メッセージ送信後にチャット履歴を更新
        }).catch((error) => {
            console.error('Error sending message:', error);
        });
    }

    function createTalkRoom(communityId, talkRoomName) {
        console.log('Creating talk room with name:', talkRoomName);
        db.collection('communities').doc(communityId).collection('talkRooms').add({
            name: talkRoomName,
            communityId: communityId
        }).then((docRef) => {
            console.log('Talk room created with ID:', docRef.id);
            loadTalkRooms(communityId);
        }).catch((error) => {
            console.error('Error creating talk room:', error);
        });
    }

    function loadCommunityMembers(communityId) {
        console.log('Loading community members for community:', communityId);
        db.collection('communities').doc(communityId).get().then((doc) => {
            if (doc.exists) {
                const communityData = doc.data();
                const memberIds = communityData.members;
                $('#community-members').empty();
                memberIds.forEach((memberId) => {
                    db.collection('users').doc(memberId).get().then((memberDoc) => {
                        if (memberDoc.exists) {
                            const memberData = memberDoc.data();
                            $('#community-members').append(`
                                <div class="community-member-item" data-id="${memberId}">
                                    <button>${memberData.name}</button>
                                </div>
                            `);
                        }
                    }).catch((error) => {
                        console.error('Error loading community member:', error);
                    });
                });

                $('.community-member-item').off('click').on('click', function () {
                    const memberId = $(this).data('id');
                    loadCommunityMemberInfo(memberId);
                });
            } else {
                console.error('No such community document!');
            }
        }).catch((error) => {
            console.error('Error loading community members:', error);
        });
    }

    function loadCommunityMemberInfo(memberId) {
        console.log('Loading community member info for member:', memberId);
        db.collection('users').doc(memberId).get().then((doc) => {
            if (doc.exists) {
                const memberData = doc.data();
                $('#community-member-info').empty().append(`
                    <div class="member-info">
                        <p>Name: ${memberData.name}</p>
                        <p>Email: ${memberData.email}</p>
                    </div>
                `);
            } else {
                console.error('No such member document!');
            }
        }).catch((error) => {
            console.error('Error getting member document:', error);
        });
    }

    function inviteNewMember(communityId, memberEmail) {
        console.log('Inviting new member with email:', memberEmail);
    }

    //Plan to Travel
    $('#travel-button').on('click', function () {
        $('#travel-form').show();
        $('#party-form').hide();
        $('#search-results').empty();
        $('#message-input-container').hide();
    });

    //Plan to Party
    $('#party-button').on('click', function () {
        $('#travel-form').hide();
        $('#party-form').show();
        $('#search-results').empty();
        $('#message-input-container').hide();
    });

    //ホテル検索関数
    function searchHotels(destination, checkin, checkout) {
        const bookingApiKey = 'YOUR_BOOKING_API_KEY';
        const url = `https://booking-com-api.example.com/hotels?destination=${destination}&checkin=${checkin}&checkout=${checkout}&apikey=${bookingApiKey}`;

        $.getJSON(url, function (data) {
            $('#search-results').empty();
            data.hotels.forEach((hotel) => {
                $('#search-results').append(`
                    <div class="search-result-item">
                        <h3>${hotel.name}</h3>
                        <p>${hotel.address}</p>
                    </div>
                `);
            });
        }).fail(function () {
            alert('Failed to fetch hotel data.');
        });
    }

    //ホテル検索アクション
    $('#search-hotel-button').on('click', function () {
        const destination = $('#hotel-destination').val();
        const checkin = $('#hotel-checkin').val();
        const checkout = $('#hotel-checkout').val();
        searchHotels(destination, checkin, checkout);
    });

    //飲食店検索アクション
    $('#search-restaurant-button').on('click', function () {
        const location = $('#restaurant-location').val();
        searchRestaurants(location);
    });

    //飲食店検索関数
    function searchRestaurants(location) {
        const url = `/search-restaurants?location=${location}`;

        $.getJSON(url, function (data) {
            $('#search-results').empty();
            data.results.shop.forEach((restaurant) => {
                $('#search-results').append(`
                    <div class="search-result-item">
                        <h3>${restaurant.name}</h3>
                        <p>${restaurant.address}</p>
                    </div>
                `);
            });
        }).fail(function () {
            alert('Failed to fetch restaurant data.');
        });
    }
});


