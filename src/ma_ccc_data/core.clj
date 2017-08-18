(ns ma-ccc-data.core
  (:require  [clojure.java.io :as io])
  (:import
   (java.io FileInputStream FileNotFoundException IOException File)
   (java.util.zip ZipInputStream ZipEntry)))

(defn entries [zipfile]
  (lazy-seq
   (if-let [entry (.getNextEntry zipfile)]
     (cons entry (entries zipfile)))))

(defn walkzip [fileName]
  (with-open [z (ZipInputStream. (FileInputStream. fileName))]
    (doall (map (fn [entry]
                  (let [len (.getSize entry)
                        v (println (.getName entry))
                        v (println len)
                        bytes (byte-array len)]
                    (.read z bytes 0 len)))
                (entries z)))))

(comment
  (do
    (def zs (ZipInputStream. (io/input-stream "MAEEA_Data/TG/TG.obs.zip")))
    (def ze (.getNextEntry zs))
    (println (.getName ze))
    (println (.getSize ze))
    (println (.getCompressedSize ze)))
  (println (walkzip "MAEEA_Data/TG/TG.obs.zip")))
(defn -main
  "I don't do a whole lot."
  [& args]
  (doall (walkzip "MAEEA_Data/TG/TG.obs.zip"))
  (println))
