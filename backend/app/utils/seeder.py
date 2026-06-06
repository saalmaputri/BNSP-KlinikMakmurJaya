from datetime import date

from app.database import SessionLocal
from app.models.entities import Category, Medicine, MedicineBatch, Role, Supplier, User
from app.utils.security import PasswordHasher


class DatabaseSeeder:
    def __init__(self) -> None:
        self.db = SessionLocal()
        self.passwords = PasswordHasher()

    def run(self) -> None:
        try:
            self.seed_roles()
            self.seed_users()
            self.seed_master_data()
            self.db.commit()
        finally:
            self.db.close()

    def seed_roles(self) -> None:
        for code, name in [("ADMIN", "Admin"), ("APOTEKER", "Apoteker"), ("KASIR", "Kasir"), ("PASIEN", "Pasien")]:
            if not self.db.query(Role).filter(Role.code == code).first():
                self.db.add(Role(code=code, name=name, permissions={}))

    def seed_users(self) -> None:
        roles = {role.code: role for role in self.db.query(Role).all()}
        defaults = [
            ("Admin Klinik", "admin@klinikmakmurjaya.com", "admin@klinikmakmurjaya.test", "ADMIN"),
            ("Apt. Siti Rahma", "apoteker@klinikmakmurjaya.com", "apoteker@klinikmakmurjaya.test", "APOTEKER"),
            ("Kasir Klinik", "kasir@klinikmakmurjaya.com", "kasir@klinikmakmurjaya.test", "KASIR"),
            ("Budi Santoso", "budi@klinikmakmurjaya.com", "budi@example.test", "PASIEN"),
        ]
        for name, email, old_email, role_code in defaults:
            user = self.db.query(User).filter(User.email.in_([email, old_email])).first()
            if user:
                user.full_name = name
                user.email = email
                user.role_id = roles[role_code].id
                user.password_hash = self.passwords.hash("Password123")
                user.status = "active"
            else:
                self.db.add(User(full_name=name, email=email, role_id=roles[role_code].id, password_hash=self.passwords.hash("Password123"), status="active"))

    def seed_master_data(self) -> None:
        category = self.db.query(Category).filter(Category.slug == "analgesik").first()
        if not category:
            category = Category(name="Analgesik", slug="analgesik", description="Obat pereda nyeri")
            self.db.add(category)
            self.db.flush()
        supplier = self.db.query(Supplier).filter(Supplier.name == "PT Sehat Farma").first()
        if not supplier:
            supplier = Supplier(name="PT Sehat Farma", contact_person="Andi", phone="021111111")
            self.db.add(supplier)
            self.db.flush()
        medicine = self.db.query(Medicine).filter(Medicine.sku == "OBT-PCM-500").first()
        if not medicine:
            medicine = Medicine(category_id=category.id, supplier_id=supplier.id, sku="OBT-PCM-500", name="Paracetamol 500mg", unit="strip", selling_price=8000, minimum_stock=20)
            self.db.add(medicine)
            self.db.flush()
            self.db.add(MedicineBatch(medicine_id=medicine.id, supplier_id=supplier.id, batch_number="PCM-SEED-001", expired_date=date(2027, 12, 31), received_date=date(2026, 6, 5), initial_quantity=100, available_quantity=100, unit_cost=5000))


if __name__ == "__main__":
    DatabaseSeeder().run()
