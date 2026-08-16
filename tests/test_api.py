import unittest
from unittest.mock import patch

import app as app_module


class FakeDoc:
    def __init__(self, payload=None, exists=True):
        self._payload = payload or {}
        self.exists = exists

    def to_dict(self):
        return self._payload


class FakeRef:
    def __init__(self, doc_id="doc-123", payload=None):
        self.id = doc_id
        self._payload = payload or {}
        self._exists = True

    def get(self):
        return FakeDoc(self._payload, self._exists)

    def set(self, payload):
        self._payload = payload
        return None

    def update(self, payload):
        self._payload.update(payload)
        return None


class FakeCollection:
    def __init__(self):
        self.docs = {}
        self.next_id_num = 123

    def document(self, doc_id=None):
        """Get or create a document reference. If doc_id is None, generate a new auto-ID."""
        if doc_id is None:
            doc_id = f"doc-{self.next_id_num}"
            self.next_id_num += 1
        if doc_id not in self.docs:
            self.docs[doc_id] = FakeRef(doc_id)
        return self.docs[doc_id]


class ApiRouteTests(unittest.TestCase):
    def setUp(self):
        self.client = app_module.app.test_client()

    @patch("api.routes.email_notifier.send_order_confirmation", return_value=True)
    @patch("api.routes.email_notifier.send_new_order_notification", return_value=True)
    @patch("api.routes.db")
    @patch("api.routes.verify_firebase_token")
    def test_create_order_returns_document_id(self, mock_verify, mock_db, *_):
        mock_verify.return_value = {"uid": "user-1", "email": "customer@example.com", "name": "Jane Doe"}
        mock_db.collection.side_effect = lambda name: {
            "users": FakeCollection(),
            "orders": FakeCollection(),
        }[name]

        response = self.client.post(
            "/api/create-order",
            json={
                "idToken": "abc",
                "templateType": "canva_modern_1",
                "resumeData": {"summary": "Experienced developer"},
            },
        )

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["orderId"], "doc-123")


if __name__ == "__main__":
    unittest.main()
