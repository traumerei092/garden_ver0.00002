const apiEndpoint = 'https://api.openai.com/v1/images/generations';  // OpenAIの画像生成APIのエンドポイント
const apiKey = '';  // 生成されたAPIキー

function generateImage(communityName, callback) {
    $.ajax({
        url: apiEndpoint,
        method: 'POST',
        contentType: 'application/json',
        headers: {
            'Authorization': `Bearer ${apiKey}`
        },
        data: JSON.stringify({
            prompt: communityName,
            n: 1,
            size: "256x256"
        }),
        success: function(response) {
            const imageUrl = response.data[0].url; // APIのレスポンスに合わせて調整
            callback(imageUrl);
        },
        error: function(error) {
            console.error('Error generating image:', error);
            // エラーハンドリングとしてプレースホルダー画像を使用
            const placeholderUrl = `https://via.placeholder.com/150?text=${encodeURIComponent(communityName)}`;
            callback(placeholderUrl);
        }
    });
}

$(document).ready(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const uid = urlParams.get('uid');

    console.log("Loaded MyPage with UID:", uid);

    if (uid) {
        // UIDを使用してユーザー情報を取得
        auth.onAuthStateChanged((user) => {
            if (user && user.uid === uid) {
                console.log("User authenticated:", user.uid);
                // Firestoreからユーザー情報を取得
                db.collection('users').doc(uid).get().then((doc) => {
                    if (doc.exists) {
                        const userData = doc.data();
                        $('#user-info').text(`Welcome, ${userData.id} !`);
                        // ユーザーの参加しているコミュニティをロード
                        loadCommunities(uid);
                    } else {
                        console.error('No such document!');
                        window.location.href = 'index.html';
                    }
                }).catch((error) => {
                    console.error('Error getting document:', error);
                    window.location.href = 'index.html';
                });
            } else {
                // ユーザーがログインしていない場合、またはUIDが一致しない場合はログインページにリダイレクト
                console.error('User not authenticated or UID does not match');
                window.location.href = 'index.html';
            }
        });
    } else {
        // UIDがない場合はログインページにリダイレクト
        console.error('UID not found in URL');
        window.location.href = 'index.html';
    }

    let currentPage = 1;
    const communitiesPerPage = 8;
    let currentCommunityId = ''; // ポップアップで使用するための現在のコミュニティID

    /**
     * loadCommunities
     * 指定されたUIDのユーザーが参加しているコミュニティをロードし、ページネーションの設定を行う
     */
    function loadCommunities(uid) {
        db.collection('users').doc(uid).get().then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                const joinedCommunities = userData.joinedCommunities || [];
                setupPagination(joinedCommunities);
                displayCommunities(joinedCommunities, currentPage);
            }
        }).catch((error) => {
            console.error('Error getting document:', error);
        });
    }

    /**
     * setupPagination
     * コミュニティのIDリストに基づいてページネーションを設定
     */
    function setupPagination(communityIds) {
        const totalPages = Math.ceil(communityIds.length / communitiesPerPage);
        updatePageInfo(totalPages);

        $('#prev-page').on('click', function() {
            if (currentPage > 1) {
                currentPage--;
                displayCommunities(communityIds, currentPage);
                updatePageInfo(totalPages);
            }
        });

        $('#next-page').on('click', function() {
            if (currentPage < totalPages) {
                currentPage++;
                displayCommunities(communityIds, currentPage);
                updatePageInfo(totalPages);
            }
        });
    }

    /**
     * displayCommunities
     * 指定されたページのコミュニティを表示する
     */
    function displayCommunities(communityIds, page) {
        const start = (page - 1) * communitiesPerPage;
        const end = start + communitiesPerPage;
        const communitySubset = communityIds.slice(start, end).filter(id => id);

        $('.communities').empty();
        communitySubset.forEach((communityId) => {
            db.collection('communities').doc(communityId).get().then((communityDoc) => {
                if (communityDoc.exists) {
                    const communityData = communityDoc.data();
                    const communityName = communityData.name;

                    // 画像生成APIを呼び出して画像URLを取得
                    generateImage(communityName, function(imageUrl) {
                        $('.communities').append(`
                            <div class="community-item">
                                <button class="community-button" data-id="${communityId}" data-joined="true">
                                    <img src="${imageUrl}" alt="${communityName}" class="community-image">
                                </button>
                                <h3>${communityName}</h3>
                            </div>
                        `);

                        //クリックして各コミュニティルームへ入室
                        $(`.community-button[data-id="${communityId}"][data-joined="true"]`).on('click', function () {
                            console.log(`Navigating to community_room.html with uid=${uid} and communityId=${communityId}`);
                            window.location.href = `community_room.html?uid=${uid}&communityId=${communityId}`;
                        });
                    });
                }
            }).catch((error) => {
                console.error('Error getting community document:', error);
            });
        });
    }

    /**
     * updatePageInfo
     * ページ情報を更新し、ページネーションボタンの状態を設定する
     */
    function updatePageInfo(totalPages) {
        $('#page-info').text(`Page ${currentPage} of ${totalPages}`);
        $('#prev-page').prop('disabled', currentPage === 1);
        $('#next-page').prop('disabled', currentPage === totalPages);
    }

    /**
     * #create-community-buttonのクリックイベント
     * 現在のユーザーのUIDを含むURLでcommunity.htmlに遷移する
     */
    $('#create-community-button').on('click', function() {
        const uid = auth.currentUser.uid;
        window.location.href = `community.html?uid=${uid}`;
    });

    /**
     * #search-community-buttonのクリックイベント
     * 検索キーワードを含むコミュニティを検索して表示する
     */
    $('#search-community-button').on('click', function() {
        const searchKeyword = $('#search-community').val().trim().toLowerCase();
        if (searchKeyword) {
            searchCommunities(searchKeyword);
        }
    });

    /**
     * searchCommunities
     * 検索キーワードを含むコミュニティをFirestoreから取得して表示する
     */
    function searchCommunities(keyword) {
        db.collection('communities')
            .where('name', '>=', keyword)
            .where('name', '<=', keyword + '\uf8ff')
            .get()
            .then((querySnapshot) => {
                const communityIds = [];
                querySnapshot.forEach((doc) => {
                    communityIds.push(doc.id);
                });
                displaySearchResults(communityIds, 1); // 1ページ目に表示
            })
            .catch((error) => {
                console.error('Error searching communities:', error);
            });
    }

    /**
     * displaySearchResults
     * 検索結果のコミュニティを表示する
     */
    function displaySearchResults(communityIds, page) {
        const start = (page - 1) * communitiesPerPage;
        const end = start + communitiesPerPage;
        const communitySubset = communityIds.slice(start, end).filter(id => id);

        $('.communities').empty();
        communitySubset.forEach((communityId) => {
            db.collection('communities').doc(communityId).get().then((communityDoc) => {
                if (communityDoc.exists) {
                    const communityData = communityDoc.data();
                    const communityName = communityData.name;

                    // 画像生成APIを呼び出して画像URLを取得
                    generateImage(communityName, function(imageUrl) {
                        $('.communities').append(`
                            <div class="community-item">
                                <button class="community-button" data-id="${communityId}" data-joined="false">
                                    <img src="${imageUrl}" alt="${communityName}" class="community-image">
                                </button>
                                <h3>${communityName}</h3>
                            </div>
                        `);

                        // クリックしてポップアップを表示
                        $(`.community-button[data-id="${communityId}"][data-joined="false"]`).on('click', function () {
                            currentCommunityId = communityId; // 現在のコミュニティIDを保存
                            $('#join-popup').show();
                        });
                    });
                }
            }).catch((error) => {
                console.error('Error getting community document:', error);
            });
        });
    }

    // ポップアップのJoinボタンのクリックイベント
    $('#join-button').on('click', function() {
        joinCommunity(currentCommunityId);
    });

    // ポップアップのCancelボタンのクリックイベント
    $('#cancel-button').on('click', function() {
        $('#join-popup').hide();
    });

    /**
     * joinCommunity
     * コミュニティに参加し、参加後にコミュニティルームに遷移する
     */
    function joinCommunity(communityId) {
        const user = auth.currentUser;
        if (user) {
            db.collection('users').doc(user.uid).update({
                joinedCommunities: firebase.firestore.FieldValue.arrayUnion(communityId)
            }).then(() => {
                console.log('Joined community:', communityId);
                window.location.href = `community_room.html?uid=${user.uid}&communityId=${communityId}`;
            }).catch((error) => {
                console.error('Error joining community:', error);
            });
        } else {
            console.error('User not authenticated');
        }
    }
});
