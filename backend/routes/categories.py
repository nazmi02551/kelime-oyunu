# routes/categories.py
from flask import Blueprint, jsonify, current_app

categories_bp = Blueprint('categories', __name__)

@categories_bp.route('/list', methods=['GET'])
def list_categories():
    db = current_app.db
    try:
        # words koleksiyonundaki aktif kategorileri döndür
        cats = db.words.distinct('kategori', {'metadata.is_active': True})
        # temizle: None/empty filtrele
        cats = [c for c in cats if c]
        return jsonify({"categories": cats})
    except Exception as e:
        print(f"❌ Kategori alınırken hata: {e}")
        return jsonify({"categories": []})
