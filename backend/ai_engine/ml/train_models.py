"""
Train LightGBM models for meal + exercise recommendation.
Run: python -m ai_engine.ml.train_models
"""
import os, joblib, pandas as pd
from datetime import date
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import lightgbm as lgb

BASE_DIR = os.path.dirname(__file__)
DATA_DIR  = os.path.join(BASE_DIR,"data")
MODEL_DIR = os.path.join(BASE_DIR,"models")
os.makedirs(MODEL_DIR, exist_ok=True)

GOAL_COLS = ["goal_lose_weight","goal_gain_muscle","goal_maintain","goal_improve_health","goal_athletic_performance"]

def train_meal_model():
    print("\n  Training meal model (150,000 rows)...")
    path = os.path.join(DATA_DIR,"meal_training.csv")
    if not os.path.exists(path):
        print("  Not found — run: python -m ai_engine.ml.data.generate_training_data")
        return
    df = pd.read_csv(path)
    feat = ["age","bmi","gender_num","activity_num","fitness_num","stress_num","meal_type_num","calorie_gap","protein_gap","calorie_ratio","is_vegetarian","is_vegan","is_diabetic","is_gluten_free","meals_per_day","sleep_quality","meal_calories","meal_protein","meal_carbs","meal_fat","meal_fiber","within_meal_class_band"] + GOAL_COLS
    X=df[feat]; y=df["accepted"]
    Xt,Xv,yt,yv = train_test_split(X,y,test_size=0.15,random_state=42,stratify=y)
    model = lgb.LGBMClassifier(n_estimators=400,learning_rate=0.04,max_depth=8,num_leaves=63,min_child_samples=30,subsample=0.85,colsample_bytree=0.85,random_state=42,verbose=-1)
    model.fit(Xt,yt,eval_set=[(Xv,yv)],callbacks=[lgb.early_stopping(30,verbose=False),lgb.log_evaluation(0)])
    acc = accuracy_score(yv,model.predict(Xv))
    print(f"  Accuracy: {acc:.2%}  (train:{len(Xt):,} test:{len(Xv):,})")
    print(classification_report(yv,model.predict(Xv),target_names=["rejected","accepted"]))
    joblib.dump({"model":model,"feature_cols":feat,"version":"v2.0","trained_at":str(date.today()),"accuracy":round(acc,4),"training_rows":len(df)},os.path.join(MODEL_DIR,"meal_model.pkl"))
    print(f"  Saved -> {os.path.join(MODEL_DIR,'meal_model.pkl')}")

def train_exercise_model():
    print("\n  Training exercise model (150,000 rows)...")
    path = os.path.join(DATA_DIR,"exercise_training.csv")
    if not os.path.exists(path):
        print("  Not found — run: python -m ai_engine.ml.data.generate_training_data")
        return
    df = pd.read_csv(path)
    feat = ["age","bmi","gender_num","activity_num","fitness_num","stress_num","calorie_gap","protein_gap","calorie_ratio","is_diabetic","meals_per_day","sleep_quality","meal_calories","meal_protein"] + GOAL_COLS
    le = LabelEncoder()
    y = le.fit_transform(df["exercise_label"])
    X = df[feat]
    Xt,Xv,yt,yv = train_test_split(X,y,test_size=0.15,random_state=42,stratify=y)
    model = lgb.LGBMClassifier(n_estimators=400,learning_rate=0.04,max_depth=8,num_leaves=63,random_state=42,verbose=-1)
    model.fit(Xt,yt,eval_set=[(Xv,yv)],callbacks=[lgb.early_stopping(30,verbose=False),lgb.log_evaluation(0)])
    acc = accuracy_score(yv,model.predict(Xv))
    print(f"  Accuracy: {acc:.2%}  classes={list(le.classes_)}")
    print(classification_report(yv,model.predict(Xv),target_names=le.classes_))
    joblib.dump({"model":model,"label_encoder":le,"feature_cols":feat,"classes":list(le.classes_),"version":"v2.0","trained_at":str(date.today()),"accuracy":round(acc,4),"training_rows":len(df)},os.path.join(MODEL_DIR,"exercise_model.pkl"))
    print(f"  Saved -> {os.path.join(MODEL_DIR,'exercise_model.pkl')}")

if __name__=="__main__":
    print("\n SmartDiet Pro — AI Model Training")
    print("="*45)
    train_meal_model()
    train_exercise_model()
    print("\n  Done.\n")
