rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    // Keep this in sync with lib/validation.ts and lib/data.ts.
    // Any mismatch means the UI accepts input the server rejects.
    function validDonor(d) {
      return d.keys().hasOnly(['uid','name','bloodGroup','phone','district','area',
                               'available','lastDonated','createdAt','updatedAt'])
        && d.keys().hasAll(['uid','name','bloodGroup','phone','district','available','createdAt','updatedAt'])
        && d.name is string && d.name.size() > 0 && d.name.size() <= 40
        && d.bloodGroup in ['A+','A-','B+','B-','AB+','AB-','O+','O-']
        && d.phone is string && d.phone.matches('^01[3-9][0-9]{8}$')
        && d.district is string && d.district.size() > 0 && d.district.size() <= 40
        && (!('area' in d) || (d.area is string && d.area.size() <= 60))
        && d.available is bool
        && (!('lastDonated' in d) || d.lastDonated == null
            || (d.lastDonated is string && d.lastDonated.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')))
        && d.createdAt is number && d.updatedAt is number;
    }

    // Admin membership is managed only from the Firebase Console:
    // create a document at admins/{auth uid}. No client writes are allowed.
    function isAdmin() {
      return request.auth != null
        && exists(/databases/$(db)/documents/admins/$(request.auth.uid));
    }

    match /admins/{uid} {
      // An admin may check whether their own account is an admin.
      allow get: if request.auth != null && request.auth.uid == uid;
    }

    match /donors/{id} {
      // Public reads, but a single list call cannot dump the whole collection.
      allow get: if true;
      allow list: if isAdmin() || request.query.limit <= 200;

      allow create: if (request.auth != null && request.auth.uid == id
                        && request.resource.data.uid == id
                        && validDonor(request.resource.data))
                    || (isAdmin() && validDonor(request.resource.data));

      allow update: if (request.auth != null && request.auth.uid == id
                        && request.resource.data.uid == id
                        && request.resource.data.createdAt == resource.data.createdAt
                        && validDonor(request.resource.data))
                    || (isAdmin()
                        && (!('uid' in resource.data)
                            || request.resource.data.uid == resource.data.uid)
                        && (!('createdAt' in resource.data)
                            || request.resource.data.createdAt == resource.data.createdAt)
                        && validDonor(request.resource.data));

      allow delete: if (request.auth != null && request.auth.uid == id) || isAdmin();
    }
  }
}
