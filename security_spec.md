# Orbit Firestore Security Specification

## 1. Data Invariants
1. Every document in Orbit's Firestore database resides under `/users/{userId}` (or a direct subcollection of `/users/{userId}`).
2. No user may read, list, create, update, or delete any document under `/users/{otherUserId}` where `otherUserId != request.auth.uid`.
3. Every document carries an immutable `uid` field matching `request.auth.uid` and the path `{userId}`.
4. Document IDs in single-document paths (`userId`, `goalId`, `assignmentId`, `opportunityId`, `taskId`, `winId`) must match `^[a-zA-Z0-9_-]+$` and stay `<= 128` characters.
5. Every string and array field enforces strict size/count bounds to prevent resource exhaustion ("Denial of Wallet").
6. Every write enforces server-verified temporal integrity via `syncedAt == request.time`.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated read of `/users/userA`**: `auth: null` -> DENIED by `isOwner(userId)` + global default-deny.
2. **Cross-user get on `/users/userA/tasks/t1`**: `auth.uid: "userB"` -> DENIED by `isOwner(userId)`.
3. **Cross-user list on `/users/userA/goals`**: `auth.uid: "userB"` -> DENIED by `isOwner(userId)`.
4. **UID Spoofing on create `/users/userA/tasks/t1`**: `auth.uid: "userA"`, payload `uid: "userB"` -> DENIED by `incoming().uid == request.auth.uid`.
5. **Shadow / Ghost field injection**: Create `/users/userA/goals/g1` with extra key `isAdmin: true` -> DENIED by `keys().hasOnly(...)`.
6. **Immutable UID mutation**: Update `/users/userA` attempting to change `uid` -> DENIED by `incoming().uid == existing().uid` and `affectedKeys().hasOnly(...)`.
7. **Immutable createdAt mutation**: Update `/users/userA/assignments/a1` attempting to alter `createdAt` -> DENIED by `incoming().createdAt == existing().createdAt`.
8. **ID Poisoning**: Create `/users/userA/tasks/..%2Fevil` or 200-char ID -> DENIED by `isValidId(taskId)`.
9. **Resource Exhaustion (1MB string)**: Update `/users/userA/tasks/t1` with `description` of 50,000 chars -> DENIED by `data.description.size() <= 2000`.
10. **Array Overflow**: Create `/users/userA/goals/g1` with `milestones` array length > 3 or `weeklyTargets` > 16 -> DENIED by array size caps.
11. **Invalid Enum Status**: Create `/users/userA/tasks/t1` with `status: "hacked"` -> DENIED by status allowlist.
12. **Client-forged timestamp**: Create `/users/userA/wins/w1` with `syncedAt` != `request.time` -> DENIED by `incoming().syncedAt == request.time`.
