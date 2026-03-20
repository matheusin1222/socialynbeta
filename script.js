
// Import Firebase services
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

const storage = getStorage(app);
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDoc,
    updateDoc, arrayUnion, arrayRemove, where, getDocs, limit, runTransaction, writeBatch, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, deleteUser
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// --- FIREBASE CONFIG & INITIALIZATION ---
const firebaseConfig = { apiKey: "AIzaSyBJlBJ40e3v9PyRXiRIJQOsagAktFyMPeE", authDomain: "socialy-934ff.firebaseapp.com", projectId: "socialy-934ff", storageBucket: "socialy-934ff.appspot.com", messagingSenderId: "541633759228", appId: "1:541633759228:web:376fcdf5c5f01807a15479", measurementId: "G-S7S7406BNS" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const postsCollection = collection(db, 'posts');
const usersCollection = collection(db, 'users');
const communitiesCollection = collection(db, 'communities');

// --- DOM ELEMENT SELECTORS ---
const authContainer = document.getElementById('auth-container');
const mainApp = document.getElementById('main-app');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginTab = document.getElementById('login-tab');
const signupTab = document.getElementById('signup-tab');
const authError = document.getElementById('auth-error');
const signupAuthError = document.getElementById('signup-auth-error');
const userAvatar = document.getElementById('user-avatar');
const userMenu = document.getElementById('user-menu');
const userMenuContainer = document.getElementById('user-menu-container');
const logoutButton = document.getElementById('logout-button');
const profileCard = { avatar: document.getElementById('profile-card-avatar'), name: document.getElementById('profile-card-name'), email: document.getElementById('profile-card-email'), following: document.getElementById('following-count'), followers: document.getElementById('followers-count') };
const createPostForm = document.getElementById('create-post-form');
const postContent = document.getElementById('post-content');
const feedContainer = document.getElementById('feed-container');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const homeButton = document.getElementById('home-button');
const mainContentArea = document.getElementById('main-content-area');
const postCreationArea = document.getElementById('post-creation-area');
const communityView = document.getElementById('community-view');
const profileView = document.getElementById('profile-view');
const communitySelect = document.getElementById('community-select');
const myCommunitiesList = document.getElementById('my-communities-list');
const notifications = { button: document.getElementById('notifications-button'), badge: document.getElementById('notifications-badge'), dropdown: document.getElementById('notifications-dropdown'), list: document.getElementById('invitations-list') };

// --- MODALS ---
const modals = { editProfile: document.getElementById('edit-profile-modal'), searchResults: document.getElementById('search-results-modal'), createCommunity: document.getElementById('create-community-modal'), inviteCommunity: document.getElementById('invite-community-modal'), settings: document.getElementById('settings-modal')};
const editProfileForm = document.getElementById('edit-profile-form');
const searchResultsList = document.getElementById('search-results-list');
const createCommunityForm = document.getElementById('create-community-form');
const inviteList = document.getElementById('invite-list');

let currentUser = null;
let currentFeedListener = null;

// --- UI HELPERS ---
const showLoading = (button) => { button.disabled = true; button.querySelector('.button-text')?.classList.add('hidden'); button.querySelector('.button-loader')?.classList.remove('hidden'); };
const hideLoading = (button) => { button.disabled = false; button.querySelector('.button-text')?.classList.remove('hidden'); button.querySelector('.button-loader')?.classList.add('hidden'); };
const openModal = (modal) => modal.classList.remove('hidden');
const closeModal = (modal) => modal.classList.add('hidden');
const formatDate = (timestamp) => timestamp ? new Date(timestamp.seconds * 1000).toLocaleDateString('pt-BR') : '';

// --- AUTHENTICATION & USER MANAGEMENT ---
const populateDateDropdowns = () => {
    const daySelect = document.getElementById('signup-day');
    const monthSelect = document.getElementById('signup-month');
    const yearSelect = document.getElementById('signup-year');
    if (!daySelect || !monthSelect || !yearSelect) return;

    // Populate days
    for (let i = 1; i <= 31; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        daySelect.appendChild(option);
    }

    // Populate months
    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = month;
        monthSelect.appendChild(option);
    });

    // Populate years
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i >= currentYear - 100; i--) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        yearSelect.appendChild(option);
    }
};
populateDateDropdowns();

const translateAuthError = (code) => ({'auth/wrong-password':'Senha incorreta.','auth/user-not-found':'Nenhum usuário encontrado com este e-mail.','auth/invalid-email':'O formato do e-mail é inválido.','auth/email-already-in-use':'Este e-mail já está cadastrado.','auth/weak-password':'A senha precisa ter no mínimo 6 caracteres.'}[code]||'Ocorreu um erro.');
loginTab.addEventListener('click',()=>{loginTab.classList.add('auth-tab-active');signupTab.classList.remove('auth-tab-active');loginForm.classList.remove('hidden');signupForm.classList.add('hidden');});
signupTab.addEventListener('click',()=>{signupTab.classList.add('auth-tab-active');loginTab.classList.remove('auth-tab-active');signupForm.classList.remove('hidden');loginForm.classList.add('hidden');});
signupForm.addEventListener('submit',async(e)=>{
    e.preventDefault();
    const btn=e.target.querySelector('button');
    showLoading(btn);
    try{
        const cred=await createUserWithEmailAndPassword(auth,e.target['signup-email'].value,e.target['signup-password'].value);
        const firstName = e.target['signup-firstname'].value;
        const lastName = e.target['signup-lastname'].value;
        const genderRadio = e.target.querySelector('input[name="signup-gender"]:checked');
        
        await setDoc(doc(usersCollection,cred.user.uid),{
            name: `${firstName} ${lastName}`.trim(),
            firstName: firstName,
            lastName: lastName,
            email:cred.user.email,
            birthday: {
                day: e.target['signup-day'].value,
                month: e.target['signup-month'].value,
                year: e.target['signup-year'].value,
            },
            gender: genderRadio ? genderRadio.value : null,
            avatar:`https://picsum.photos/seed/${cred.user.uid}/80/80`,
            bio:'',
            following:[],
            followers:[],
            invitations:[],
            createdAt:serverTimestamp()
        });
    }catch(err){
        signupAuthError.textContent=translateAuthError(err.code);
        signupAuthError.classList.remove('hidden');
    }finally{
        hideLoading(btn);
    }
});
loginForm.addEventListener('submit',async(e)=>{e.preventDefault();const btn=e.target.querySelector('button');showLoading(btn);try{await signInWithEmailAndPassword(auth,e.target['login-email'].value,e.target['login-password'].value);}catch(err){authError.textContent=translateAuthError(err.code);authError.classList.remove('hidden');}finally{hideLoading(btn);}});
logoutButton.addEventListener('click',()=>signOut(auth));
onAuthStateChanged(auth,async(user)=>{if(user){const unsub=onSnapshot(doc(usersCollection,user.uid), (userDoc)=>{if(userDoc.exists()){currentUser={uid:user.uid,...userDoc.data()};authContainer.classList.add('hidden');mainApp.classList.remove('hidden');updateUIForUser();listenForPosts();renderUserSuggestions();renderTrendingTopics();listenForMyCommunities();listenForInvitations();}else{signOut(auth);}}); }else{currentUser=null;mainApp.classList.add('hidden');authContainer.classList.remove('hidden');if(currentFeedListener)currentFeedListener();}});
const handleDeleteAccount = async () => { if (!confirm('VOCÊ TEM CERTEZA? Esta ação é irreversível e apagará sua conta e todos os seus posts.')) return; try { const user = auth.currentUser; if (!user) throw new Error("Usuário não encontrado"); const postsQuery = query(postsCollection, where('authorId', '==', user.uid)); const postsSnapshot = await getDocs(postsQuery); const batch = writeBatch(db); postsSnapshot.forEach(doc => { batch.delete(doc.ref); }); await batch.commit(); await deleteDoc(doc(usersCollection, user.uid)); await deleteUser(user); alert('Conta apagada com sucesso.'); } catch (error) { console.error("Erro ao apagar conta:", error); alert("Erro ao apagar conta. Pode ser necessário fazer login novamente por segurança."); }};

// --- UI & PROFILE ---
const updateUIForUser = () => { if (!currentUser) return; userAvatar.src = currentUser.avatar; profileCard.avatar.src = currentUser.avatar; profileCard.name.textContent = currentUser.name; profileCard.email.textContent = currentUser.email; profileCard.following.textContent = currentUser.following?.length || 0; profileCard.followers.textContent = currentUser.followers?.length || 0; };
userAvatar.addEventListener('click',(e)=>{e.stopPropagation();userMenu.classList.toggle('hidden');});
document.addEventListener('click',(e)=>{if(!userMenuContainer.contains(e.target)&&!userMenu.classList.contains('hidden'))userMenu.classList.add('hidden');});
document.getElementById('edit-profile-button').addEventListener('click',()=>{editProfileForm.elements['edit-name'].value=currentUser.name;editProfileForm.elements['edit-avatar'].value=currentUser.avatar;editProfileForm.elements['edit-bio'].value=currentUser.bio;openModal(modals.editProfile);});
editProfileForm.addEventListener('submit',async(e)=>{e.preventDefault();const newName=e.target['edit-name'].value;const newAvatar=e.target['edit-avatar'].value;const newBio=e.target['edit-bio'].value;if(newName&&newAvatar){const userRef=doc(usersCollection,currentUser.uid);await updateDoc(userRef,{name:newName,avatar:newAvatar,bio:newBio});currentUser.name=newName;currentUser.avatar=newAvatar;currentUser.bio=newBio;updateUIForUser();closeModal(modals.editProfile);}});

// --- FOLLOW SYSTEM ---
const handleFollow=async(targetUserId)=>{const isFollowing=currentUser.following.includes(targetUserId);const currentUserRef=doc(usersCollection,currentUser.uid);const targetUserRef=doc(usersCollection,targetUserId);await runTransaction(db,async(t)=>{if(isFollowing){t.update(currentUserRef,{following:arrayRemove(targetUserId)});t.update(targetUserRef,{followers:arrayRemove(currentUser.uid)});currentUser.following=currentUser.following.filter(id=>id!==targetUserId);}else{t.update(currentUserRef,{following:arrayUnion(targetUserId)});t.update(targetUserRef,{followers:arrayUnion(currentUser.uid)});currentUser.following.push(targetUserId);}});updateUIForUser();renderUserSuggestions();};

// --- POSTS, LIKES, COMMENTS ---
const getHashtags = (text) => text.match(/#\w+/g) || [];
createPostForm.addEventListener('submit',async(e)=>{e.preventDefault();const btn=document.getElementById('post-submit-button');showLoading(btn);const content=postContent.value.trim();const targetCommunityId=communitySelect.value;if(content&&currentUser){try{await addDoc(postsCollection,{authorId:currentUser.uid,authorName:currentUser.name,authorAvatar:currentUser.avatar,content:content,likes:[],commentCount:0,communityId:targetCommunityId==='main'?null:targetCommunityId,hashtags:getHashtags(content),timestamp:serverTimestamp()});postContent.value='';postContent.style.height='auto'; if(targetCommunityId !== 'main') { const communityDoc = await getDoc(doc(communitiesCollection, targetCommunityId)); renderCommunityView({ id: communityDoc.id, ...communityDoc.data() }); } }catch(err){console.error("Error creating post:",err);}finally{hideLoading(btn);}}else{hideLoading(btn);}});
postContent.addEventListener('input',()=>{postContent.style.height='auto';postContent.style.height=postContent.scrollHeight+'px';});
const handleLike=async(postId,likes)=>{const isLiked=likes.includes(currentUser.uid);const postRef=doc(postsCollection,postId);await updateDoc(postRef,{likes:isLiked?arrayRemove(currentUser.uid):arrayUnion(currentUser.uid)});};
const handleDeletePost = async (postId) => { await deleteDoc(doc(postsCollection, postId)); };
const handleComment=async(postId,inputElement)=>{const text=inputElement.value.trim();if(!text)return;const commentsRef=collection(db,'posts',postId,'comments');await addDoc(commentsRef,{authorId:currentUser.uid,authorName:currentUser.name,authorAvatar:currentUser.avatar,text:text,timestamp:serverTimestamp()});await runTransaction(db,async(t)=>{const postRef=doc(postsCollection,postId);const postDoc=await t.get(postRef);t.update(postRef,{commentCount:(postDoc.data().commentCount||0)+1});});inputElement.value='';};
// Função para lidar com o upload e criar post
const handleCreatePost = async (text, imageFile) => {
    let imageUrl = null;
    
    if (imageFile) {
        const storageRef = ref(storage, `posts/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
    }

    await addDoc(postsCollection, {
        text: text,
        imageUrl: imageUrl,
        authorId: auth.currentUser.uid,
        timestamp: serverTimestamp(),
        likes: []
    });
};

// --- SEARCH ---
searchForm.addEventListener('submit',async(e)=>{e.preventDefault();const searchTerm=searchInput.value.trim();if(!searchTerm)return;const q=query(usersCollection,where('name','>=',searchTerm),where('name','<=',searchTerm+'\uf8ff'));const querySnapshot=await getDocs(q);const results=querySnapshot.docs.map(doc=>({id:doc.id,...doc.data()})).filter(user=>user.id!==currentUser.uid);renderSearchResults(results);openModal(modals.searchResults);});

// --- COMMUNITIES & INVITATIONS ---
document.getElementById('create-community-button').addEventListener('click',()=>openModal(modals.createCommunity));
createCommunityForm.addEventListener('submit',async(e)=>{e.preventDefault();const name=e.target['community-name'].value.trim();const desc=e.target['community-desc'].value.trim();if(!name)return;await addDoc(communitiesCollection,{name:name,description:desc,creatorId:currentUser.uid,members:[currentUser.uid],createdAt:serverTimestamp()});closeModal(modals.createCommunity);createCommunityForm.reset();});
const joinCommunity=async(communityId)=>{await updateDoc(doc(communitiesCollection,communityId),{members:arrayUnion(currentUser.uid)});};
const handleInvite=async(community,targetUserId)=>{const targetUserRef=doc(usersCollection,targetUserId);await updateDoc(targetUserRef,{invitations:arrayUnion({communityId:community.id,communityName:community.name,inviterId:currentUser.uid,inviterName:currentUser.name})});};
const handleInvitation=async(invitation,accept)=>{const userRef=doc(usersCollection,currentUser.uid);await updateDoc(userRef,{invitations:arrayRemove(invitation)});if(accept){await updateDoc(doc(communitiesCollection,invitation.communityId),{members:arrayUnion(currentUser.uid)});}};
notifications.button.addEventListener('click',(e)=>{e.stopPropagation();notifications.dropdown.classList.toggle('hidden');});
document.addEventListener('click',(e)=>{if(!notifications.container?.contains(e.target))notifications.dropdown.classList.add('hidden');});
const listenForInvitations=()=>{onSnapshot(doc(usersCollection,currentUser.uid),(doc)=>{const invites=doc.data()?.invitations||[];notifications.badge.textContent=invites.length;invites.length>0?notifications.badge.classList.remove('hidden'):notifications.badge.classList.add('hidden');notifications.list.innerHTML=invites.length?invites.map(inv=>`<div class="text-sm"> <p class="text-gray-700"><b>${inv.inviterName}</b> convidou você para <b>${inv.communityName}</b></p> <div class="flex gap-2 mt-2"> <button data-invite-accept='${JSON.stringify(inv)}' class="flex-1 text-xs bg-green-500 text-white py-1 px-2 rounded hover:bg-green-600">Aceitar</button> <button data-invite-decline='${JSON.stringify(inv)}' class="flex-1 text-xs bg-gray-300 py-1 px-2 rounded hover:bg-gray-400">Recusar</button> </div> </div>`).join(''):`<p class="text-gray-500 text-sm">Nenhum convite novo.</p>`;});};
document.addEventListener('click',(e)=>{if(e.target.dataset.inviteAccept){handleInvitation(JSON.parse(e.target.dataset.inviteAccept),true);}if(e.target.dataset.inviteDecline){handleInvitation(JSON.parse(e.target.dataset.inviteDecline),false);}});

// --- DYNAMIC RENDERING ---
const createPostElement=(post)=>{const element=document.createElement('div');element.className='bg-white p-4 rounded-lg shadow-md';const isLiked=post.likes.includes(currentUser.uid);element.innerHTML=`<div class="flex items-start"><img src="${post.authorAvatar}" alt="${post.authorName}" class="w-12 h-12 rounded-full mr-4"><div class="flex-1"><div class="flex justify-between items-center"><button data-user-id="${post.authorId}" class="font-bold text-gray-800 hover:underline profile-link">${post.authorName}</button>${post.authorId===currentUser.uid?`<button data-post-id="${post.id}" class="delete-post-button"><i class="fas fa-trash"></i></button>`:''}</div><p class="mt-2 text-gray-700 whitespace-pre-wrap">${post.content.replace(/#\w+/g,'<span class="text-blue-600 font-semibold">$&</span>')}</p></div></div><div class="mt-4 pt-3 border-t flex items-center space-x-4 text-gray-500"><button data-post-id="${post.id}" class="like-button flex items-center space-x-2 hover:text-red-500 ${isLiked?'active-like':''}"><i class="fas fa-heart"></i><span>${post.likes.length}</span></button><button class="comment-button flex items-center space-x-2 hover:text-red-500"><i class="fas fa-comment"></i><span>${post.commentCount||0}</span></button></div><div class="comments-section mt-4 pt-4 border-t hidden"><div class="comment-list space-y-3"></div><form class="comment-form mt-4 flex gap-2"><input type="text" placeholder="Escreva um comentário..." class="flex-1 border-gray-300 rounded-md text-sm"><button type="submit" class="primary-button text-sm">Postar</button></form></div>`;element.querySelector('.like-button').addEventListener('click',()=>handleLike(post.id,post.likes));const deleteBtn=element.querySelector('.delete-post-button');if(deleteBtn){deleteBtn.addEventListener('click',()=>confirm('Tem certeza que deseja apagar este post?')&&handleDeletePost(post.id));}element.querySelector('.comment-button').addEventListener('click',(e)=>e.currentTarget.closest('.bg-white').querySelector('.comments-section').classList.toggle('hidden'));element.querySelector('.comment-form').addEventListener('submit',(e)=>{e.preventDefault();handleComment(post.id,e.target.querySelector('input'))});renderComments(post.id,element.querySelector('.comment-list'));return element;};
const renderFeed=(posts)=>{const container=document.querySelector('#main-content-area > div:not(.hidden) > div[id$="-container"], #feed-container');if(!container){return;}container.innerHTML='';posts.forEach(post=>container.appendChild(createPostElement(post)));};
const renderComments=(postId,container)=>{const q=query(collection(db,'posts',postId,'comments'),orderBy('timestamp','asc'));onSnapshot(q,(snapshot)=>{container.innerHTML=snapshot.docs.map(doc=>{const c=doc.data();return`<div class="flex items-start text-sm"><img src="${c.authorAvatar}" class="w-8 h-8 rounded-full mr-3"><div class="bg-gray-100 p-2 rounded-lg flex-1"><button data-user-id="${c.authorId}" class="font-bold hover:underline profile-link">${c.authorName}</button><p class="text-gray-700">${c.text}</p></div></div>`}).join('');});};
const renderTrendingTopics=async()=>{const q=query(postsCollection,orderBy('timestamp','desc'),limit(20));const snapshot=await getDocs(q);const hashtags=snapshot.docs.flatMap(doc=>doc.data().hashtags||[]);const trending=Object.entries(hashtags.reduce((acc,tag)=>{acc[tag]=(acc[tag]||0)+1;return acc;},{})).sort((a,b)=>b[1]-a[1]).slice(0,5);document.getElementById('trending-topics-list').innerHTML=trending.map(t=>`<li><a href="#" class="font-bold text-blue-600 hover:underline">${t[0]}</a></li>`).join('');};
const renderUserSuggestions=async()=>{const q=query(usersCollection,limit(10));const snapshot=await getDocs(q);const users=snapshot.docs.map(d=>({id:d.id,...d.data()})).filter(u=>u.id!==currentUser.uid&&!currentUser.following.includes(u.id)).slice(0,3);document.getElementById('user-suggestions-list').innerHTML=users.map(u=>`<div class="flex items-center space-x-3"><img src="${u.avatar}" class="w-10 h-10 rounded-full"><div><button data-user-id="${u.id}" class="font-bold text-sm text-gray-800 hover:underline profile-link">${u.name}</button></div><button data-user-id="${u.id}" class="follow-btn ml-auto bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs py-1 px-3 rounded">Seguir</button></div>`).join('');};
const renderSearchResults=(results)=>{searchResultsList.innerHTML=results.length?results.map(u=>`<div class="flex items-center space-x-3"><img src="${u.avatar}" class="w-10 h-10 rounded-full"><div><p class="font-bold text-sm text-gray-800">${u.name}</p></div><button data-user-id="${u.id}" class="follow-btn ml-auto bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs py-1 px-3 rounded">Seguir</button></div>`).join(''):`<p class="text-gray-500">Nenhum usuário encontrado.</p>`;};
const renderCommunityView=async(community)=>{showMainContentArea(communityView);const isMember=community.members.includes(currentUser.uid);communityView.innerHTML=`<div class="bg-white p-4 rounded-lg shadow-md"><h2 class="text-2xl font-bold">${community.name}</h2><p class="text-gray-600 mt-2">${community.description}</p><p class="text-sm text-gray-500 mt-2">${community.members.length} membros</p><div class="mt-4 flex gap-3">${!isMember?`<button id="join-community-btn" class="primary-button">Entrar na Comunidade</button>`:`<button id="invite-community-btn" class="primary-button">Convidar</button>`}</div></div><div id="community-feed-container" class="space-y-6 mt-6"></div>`;if(!isMember){document.getElementById('join-community-btn').addEventListener('click',async()=>{await joinCommunity(community.id);renderCommunityView({...community,members:[...community.members,currentUser.uid]});});}else{document.getElementById('invite-community-btn').addEventListener('click',()=>renderInviteModal(community));}listenForPosts(community.id);};
const renderProfileView=async(userId)=>{showMainContentArea(profileView);const userDoc=await getDoc(doc(usersCollection,userId));if(!userDoc.exists())return;const user=userDoc.data();const isCurrentUser=userId===currentUser.uid;const isFollowing=currentUser.following.includes(userId);profileView.innerHTML=`<div class="bg-white p-6 rounded-lg shadow-md"><div class="flex items-center"><img src="${user.avatar}" class="w-24 h-24 rounded-full mr-6"><div class="flex-1"><h2 class="text-3xl font-bold">${user.name}</h2><p class="text-gray-600">${user.email}</p><p class="text-sm text-gray-500 mt-1">Na Socialy desde: ${formatDate(user.createdAt)}</p><div class="flex space-x-4 text-sm mt-2"><span><span class="font-bold">${user.following.length}</span> Seguindo</span><span><span class="font-bold">${user.followers.length}</span> Seguidores</span></div></div>${!isCurrentUser?`<button data-user-id="${userId}" class="follow-btn ${isFollowing?'secondary-button':'primary-button'}">${isFollowing?'Deixar de Seguir':'Seguir'}</button>`:''}</div><p class="mt-4 text-gray-700">${user.bio||'Nenhuma bio disponível.'}</p></div><h3 class="mt-8 mb-4 text-xl font-bold text-gray-800">Publicações</h3><div id="profile-feed-container" class="space-y-6"></div>`;listenForUserPosts(userId);};
const renderInviteModal=async(community)=>{const followingDocs=await Promise.all(currentUser.following.map(id=>getDoc(doc(usersCollection,id))));const followingUsers=followingDocs.map(d=>({id:d.id,...d.data()}));const nonMembers=followingUsers.filter(u=>!community.members.includes(u.id));inviteList.innerHTML=nonMembers.length?nonMembers.map(u=>`<div class="flex items-center"><img src="${u.avatar}" class="w-10 h-10 rounded-full mr-3"><span>${u.name}</span><button data-user-id="${u.id}" class="invite-btn ml-auto secondary-button text-xs">Convidar</button></div>`).join(''):`<p class="text-gray-500">Todos que você segue já são membros.</p>`;inviteList.querySelectorAll('.invite-btn').forEach(b=>b.addEventListener('click',async e=>{handleInvite(community,e.target.dataset.userId);e.target.textContent='Convidado';e.target.disabled=true;}));openModal(modals.inviteCommunity);};
const listenForMyCommunities=()=>{const q=query(communitiesCollection,where('members','array-contains',currentUser.uid));onSnapshot(q,(snapshot)=>{const communities=snapshot.docs.map(d=>({id:d.id,...d.data()}));myCommunitiesList.innerHTML=communities.map(c=>`<a href="#" data-community-id="${c.id}" class="block text-sm font-semibold text-gray-800 hover:text-red-600 community-link">${c.name}</a>`).join('');communitySelect.innerHTML=`<option value="main">Feed Principal</option>`+communities.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');});};

// --- FEED & VIEW LOGIC ---
const showMainContentArea=(viewToShow)=>{[feedContainer,postCreationArea,communityView,profileView].forEach(v=>v.classList.add('hidden'));if(viewToShow===feedContainer){feedContainer.classList.remove('hidden');postCreationArea.classList.remove('hidden');}else{viewToShow.classList.remove('hidden');}};
homeButton.addEventListener('click',(e)=>{e.preventDefault();showMainContentArea(feedContainer);listenForPosts();});
document.addEventListener('click',async e=>{if(e.target.closest('.community-link')){e.preventDefault();const communityDoc=await getDoc(doc(communitiesCollection,e.target.closest('.community-link').dataset.communityId));renderCommunityView({id:communityDoc.id,...communityDoc.data()});}if(e.target.closest('.profile-link')){e.preventDefault();renderProfileView(e.target.closest('.profile-link').dataset.userId);}if(e.target.closest('.follow-btn')){handleFollow(e.target.closest('.follow-btn').dataset.userId);}});
const listenForPosts=(communityId=null)=>{if(currentFeedListener)currentFeedListener();const q=query(postsCollection,where('communityId','==',communityId),orderBy('timestamp','desc'));currentFeedListener=onSnapshot(q,(snapshot)=>{const posts=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));renderFeed(posts);});};
const listenForUserPosts=(userId)=>{const q=query(postsCollection,where('authorId','==',userId),orderBy('timestamp','desc'));onSnapshot(q,(snapshot)=>{const posts=snapshot.docs.map(d=>({id:d.id,...d.data()}));const container=document.getElementById('profile-feed-container');container.innerHTML='';posts.forEach(p=>container.appendChild(createPostElement(p)));});};

// --- MODAL & GLOBAL EVENT LISTENERS ---
document.querySelectorAll('.modal-overlay').forEach(m=>m.addEventListener('click',(e)=>{if(e.target===m)closeModal(m);}));
document.querySelectorAll('.modal-close-button').forEach(b=>b.addEventListener('click',(e)=>closeModal(e.target.closest('.modal-overlay'))));
document.getElementById('settings-button').addEventListener('click', () => openModal(modals.settings));
document.getElementById('delete-account-button').addEventListener('click', handleDeleteAccount);
