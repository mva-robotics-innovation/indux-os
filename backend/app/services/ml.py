from sklearn.ensemble import IsolationForest
import numpy as np
class PredictiveMaintenanceModel:
    def __init__(self):
        self.model = IsolationForest(contamination=0.05, random_state=42)
        self.trained = False
    def train(self, data):
        if len(data)<20: return {"status":"insufficient_data"}
        X = np.array([[d.get(k,0) for k in ["vibration","temperature","pressure","current","runtime"]] for d in data])
        self.model.fit(X); self.trained=True
        return {"status":"trained","samples":len(data)}
    def predict(self, sample):
        if not self.trained: return {"anomaly":False,"score":0.0,"reason":"model_not_trained"}
        x = np.array([[sample.get(k,0) for k in ["vibration","temperature","pressure","current","runtime"]]])
        score = self.model.decision_function(x)[0]
        anomaly = self.model.predict(x)[0]==-1
        return {"anomaly": bool(anomaly),"anomaly_score": float(-score),"confidence": float(min(0.99, abs(score)*2))}
pm_model = PredictiveMaintenanceModel()
