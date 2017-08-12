(ns ma-ccc-data.core
  (:import
   (java.io FileInputStream FileNotFoundException IOException File)
   (java.util.zip ZipInputStream ZipEntry)))

(defn entries [zipfile]
  (lazy-seq
   (if-let [entry (.getNextEntry zipfile)]
     (cons entry (entries zipfile)))))

(defn walkzip [fileName]
  (with-open [z (ZipInputStream. (FileInputStream. fileName))]
    (doall (map #(.toString %) (entries z)))))

(comment
  (println (walkzip "MAEEA_Data/TG/TG.obs.zip")))
(defn -main
  "I don't do a whole lot."
  [& args]
  (doall (walkzip "MAEEA_Data/TG/TG.obs.zip"))
  (println))
