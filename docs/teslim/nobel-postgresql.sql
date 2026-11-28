--
-- Nobel Ödülü Değerlendirme Sistemi, VTYS ders veritabanı
-- PostgreSQL 16, tablosuz bir public şemasına yüklenir.
--

\restrict hRDexysrc9wjn1wP5fg7uOUYPkOB9LcbGs16W8z4vJaer9OctrBZVDEJLeUluTh

-- Dumped from database version 16.16
-- Dumped by pg_dump version 16.16

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: enforce_committee_minimum_members(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_committee_minimum_members() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    target_committee_id BIGINT;
    member_count INTEGER;
BEGIN
    IF TG_TABLE_NAME = 'degerlendirme_komitesi' THEN
        target_committee_id := NEW.komite_id;
    ELSIF TG_OP = 'DELETE' THEN
        target_committee_id := OLD.komite_id;
    ELSE
        target_committee_id := OLD.komite_id;
    END IF;

    -- Parent deletion cascades to members; the committee no longer needs a minimum.
    IF NOT EXISTS (SELECT 1 FROM degerlendirme_komitesi WHERE komite_id = target_committee_id) THEN
        RETURN NULL;
    END IF;

    SELECT COUNT(*) INTO member_count FROM komite_uyesi WHERE komite_id = target_committee_id;
    IF member_count < 3 THEN
        RAISE EXCEPTION 'Komite en az 3 uzman üyeye sahip olmalıdır (komite_id=%; mevcut üye=%).', target_committee_id, member_count
            USING ERRCODE = '23514', CONSTRAINT = 'komite_en_az_uc_uzman';
    END IF;

    IF TG_TABLE_NAME = 'komite_uyesi' AND TG_OP = 'UPDATE' AND NEW.komite_id <> OLD.komite_id THEN
        SELECT COUNT(*) INTO member_count FROM komite_uyesi WHERE komite_id = NEW.komite_id;
        IF member_count < 3 THEN
            RAISE EXCEPTION 'Komite en az 3 uzman üyeye sahip olmalıdır (komite_id=%; mevcut üye=%).', NEW.komite_id, member_count
                USING ERRCODE = '23514', CONSTRAINT = 'komite_en_az_uc_uzman';
        END IF;
    END IF;
    RETURN NULL;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: aday; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aday (
    aday_id bigint NOT NULL,
    ad character varying(100) NOT NULL,
    soyad character varying(100) NOT NULL,
    cinsiyet character varying(30) NOT NULL,
    dogum_tarihi date NOT NULL,
    uyruk character varying(100) NOT NULL,
    calisma_alani character varying(150) NOT NULL,
    CONSTRAINT aday_dogum_tarihi_check CHECK ((dogum_tarihi < CURRENT_DATE))
);


--
-- Name: aday_aday_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.aday_aday_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: aday_aday_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.aday_aday_id_seq OWNED BY public.aday.aday_id;


--
-- Name: aday_gosterme; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aday_gosterme (
    aday_gosterme_id bigint NOT NULL,
    kurulus_no bigint NOT NULL,
    aday_id bigint NOT NULL,
    odul_no bigint NOT NULL,
    tarih date NOT NULL,
    saat time without time zone NOT NULL
);


--
-- Name: aday_gosterme_aday_gosterme_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.aday_gosterme_aday_gosterme_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: aday_gosterme_aday_gosterme_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.aday_gosterme_aday_gosterme_id_seq OWNED BY public.aday_gosterme.aday_gosterme_id;


--
-- Name: degerlendirme; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.degerlendirme (
    degerlendirme_id bigint NOT NULL,
    aday_id bigint NOT NULL,
    komite_id bigint NOT NULL,
    tarih date NOT NULL,
    sonuc character varying(100) NOT NULL,
    olcut character varying(255) NOT NULL,
    kesinlesmis boolean GENERATED ALWAYS AS (((sonuc)::text = ANY ((ARRAY['KABUL'::character varying, 'RED'::character varying, 'INCELEMEDE'::character varying])::text[]))) STORED
);


--
-- Name: degerlendirme_degerlendirme_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.degerlendirme_degerlendirme_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: degerlendirme_degerlendirme_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.degerlendirme_degerlendirme_id_seq OWNED BY public.degerlendirme.degerlendirme_id;


--
-- Name: degerlendirme_komitesi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.degerlendirme_komitesi (
    komite_id bigint NOT NULL,
    komite_adi character varying(200) NOT NULL,
    kategori_id bigint NOT NULL
);


--
-- Name: degerlendirme_komitesi_komite_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.degerlendirme_komitesi_komite_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: degerlendirme_komitesi_komite_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.degerlendirme_komitesi_komite_id_seq OWNED BY public.degerlendirme_komitesi.komite_id;


--
-- Name: kategori; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kategori (
    kategori_id bigint NOT NULL,
    kategori_adi character varying(100) NOT NULL
);


--
-- Name: kategori_kategori_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kategori_kategori_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kategori_kategori_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kategori_kategori_id_seq OWNED BY public.kategori.kategori_id;


--
-- Name: komite_uyesi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.komite_uyesi (
    komite_id bigint NOT NULL,
    uzman_id bigint NOT NULL
);


--
-- Name: kurulus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kurulus (
    kurulus_no bigint NOT NULL,
    ad character varying(200) NOT NULL,
    konum character varying(200) NOT NULL,
    iletisim_bilgisi character varying(255) NOT NULL
);


--
-- Name: kurulus_kurulus_no_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kurulus_kurulus_no_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kurulus_kurulus_no_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kurulus_kurulus_no_seq OWNED BY public.kurulus.kurulus_no;


--
-- Name: odul; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.odul (
    odul_no bigint NOT NULL,
    aciklayici_ad character varying(200) NOT NULL,
    kategori_id bigint NOT NULL
);


--
-- Name: odul_odul_no_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.odul_odul_no_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: odul_odul_no_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.odul_odul_no_seq OWNED BY public.odul.odul_no;


--
-- Name: uzman; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.uzman (
    uzman_id bigint NOT NULL,
    ad character varying(150) NOT NULL,
    adres text NOT NULL,
    yas integer NOT NULL,
    cinsiyet character varying(30) NOT NULL,
    uzmanlik_alani character varying(150) NOT NULL,
    CONSTRAINT uzman_yas_check CHECK (((yas >= 18) AND (yas <= 120)))
);


--
-- Name: uzman_oyu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.uzman_oyu (
    oy_id bigint NOT NULL,
    komite_id bigint NOT NULL,
    uzman_id bigint NOT NULL,
    aday_id bigint NOT NULL,
    olcut character varying(255) NOT NULL,
    karar character varying(30) NOT NULL,
    oy_zamani timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_uzman_oyu_karar CHECK (((karar)::text = ANY ((ARRAY['KABUL'::character varying, 'RED'::character varying, 'INCELEMEDE'::character varying])::text[])))
);


--
-- Name: uzman_oyu_oy_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.uzman_oyu_oy_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: uzman_oyu_oy_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.uzman_oyu_oy_id_seq OWNED BY public.uzman_oyu.oy_id;


--
-- Name: uzman_uzman_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.uzman_uzman_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: uzman_uzman_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.uzman_uzman_id_seq OWNED BY public.uzman.uzman_id;


--
-- Name: aday aday_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aday ALTER COLUMN aday_id SET DEFAULT nextval('public.aday_aday_id_seq'::regclass);


--
-- Name: aday_gosterme aday_gosterme_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aday_gosterme ALTER COLUMN aday_gosterme_id SET DEFAULT nextval('public.aday_gosterme_aday_gosterme_id_seq'::regclass);


--
-- Name: degerlendirme degerlendirme_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.degerlendirme ALTER COLUMN degerlendirme_id SET DEFAULT nextval('public.degerlendirme_degerlendirme_id_seq'::regclass);


--
-- Name: degerlendirme_komitesi komite_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.degerlendirme_komitesi ALTER COLUMN komite_id SET DEFAULT nextval('public.degerlendirme_komitesi_komite_id_seq'::regclass);


--
-- Name: kategori kategori_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kategori ALTER COLUMN kategori_id SET DEFAULT nextval('public.kategori_kategori_id_seq'::regclass);


--
-- Name: kurulus kurulus_no; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kurulus ALTER COLUMN kurulus_no SET DEFAULT nextval('public.kurulus_kurulus_no_seq'::regclass);


--
-- Name: odul odul_no; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.odul ALTER COLUMN odul_no SET DEFAULT nextval('public.odul_odul_no_seq'::regclass);


--
-- Name: uzman uzman_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uzman ALTER COLUMN uzman_id SET DEFAULT nextval('public.uzman_uzman_id_seq'::regclass);


--
-- Name: uzman_oyu oy_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uzman_oyu ALTER COLUMN oy_id SET DEFAULT nextval('public.uzman_oyu_oy_id_seq'::regclass);


--
-- Data for Name: aday; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.aday (aday_id, ad, soyad, cinsiyet, dogum_tarihi, uyruk, calisma_alani) VALUES (1, 'Ada', 'Yılmaz', 'Kadın', '1970-04-12', 'Türkiye', 'Kuantum fiziği');
INSERT INTO public.aday (aday_id, ad, soyad, cinsiyet, dogum_tarihi, uyruk, calisma_alani) VALUES (2, 'Deniz', 'Kaya', 'Erkek', '1965-09-23', 'Türkiye', 'Kimya');
INSERT INTO public.aday (aday_id, ad, soyad, cinsiyet, dogum_tarihi, uyruk, calisma_alani) VALUES (3, 'Mina', 'Demir', 'Kadın', '1980-01-05', 'İsveç', 'Tıp araştırmaları');
INSERT INTO public.aday (aday_id, ad, soyad, cinsiyet, dogum_tarihi, uyruk, calisma_alani) VALUES (4, 'Aras', 'Şahin', 'Erkek', '1975-06-18', 'Norveç', 'Barış çalışmaları');
INSERT INTO public.aday (aday_id, ad, soyad, cinsiyet, dogum_tarihi, uyruk, calisma_alani) VALUES (5, 'Selin', 'Arslan', 'Kadın', '1978-04-17', 'Türkiye', 'Parçacık fiziği');
INSERT INTO public.aday (aday_id, ad, soyad, cinsiyet, dogum_tarihi, uyruk, calisma_alani) VALUES (6, 'Ece', 'Aydın', 'Kadın', '1982-09-08', 'Türkiye', 'Bağışıklık araştırmaları');
INSERT INTO public.aday (aday_id, ad, soyad, cinsiyet, dogum_tarihi, uyruk, calisma_alani) VALUES (7, 'Arda', 'Yalçın', 'Erkek', '1976-02-23', 'Türkiye', 'Sürdürülebilir kataliz');


--
-- Data for Name: aday_gosterme; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.aday_gosterme (aday_gosterme_id, kurulus_no, aday_id, odul_no, tarih, saat) VALUES (1, 1, 1, 1, '2025-01-10', '09:30:00');
INSERT INTO public.aday_gosterme (aday_gosterme_id, kurulus_no, aday_id, odul_no, tarih, saat) VALUES (2, 2, 3, 3, '2025-01-12', '11:00:00');
INSERT INTO public.aday_gosterme (aday_gosterme_id, kurulus_no, aday_id, odul_no, tarih, saat) VALUES (3, 3, 4, 5, '2025-01-15', '14:15:00');
INSERT INTO public.aday_gosterme (aday_gosterme_id, kurulus_no, aday_id, odul_no, tarih, saat) VALUES (4, 4, 5, 7, '2025-09-29', '09:30:00');
INSERT INTO public.aday_gosterme (aday_gosterme_id, kurulus_no, aday_id, odul_no, tarih, saat) VALUES (5, 5, 6, 8, '2025-09-30', '09:30:00');
INSERT INTO public.aday_gosterme (aday_gosterme_id, kurulus_no, aday_id, odul_no, tarih, saat) VALUES (6, 6, 7, 9, '2025-10-01', '09:30:00');


--
-- Data for Name: degerlendirme; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.degerlendirme (degerlendirme_id, aday_id, komite_id, tarih, sonuc, olcut) VALUES (1, 1, 1, '2025-03-01', 'Ön değerlendirmede başarılı', 'Bilimsel özgünlük ve etki');
INSERT INTO public.degerlendirme (degerlendirme_id, aday_id, komite_id, tarih, sonuc, olcut) VALUES (2, 3, 2, '2025-03-02', 'İnceleme sürüyor', 'Klinik katkı ve toplumsal fayda');
INSERT INTO public.degerlendirme (degerlendirme_id, aday_id, komite_id, tarih, sonuc, olcut) VALUES (3, 4, 3, '2025-03-03', 'Ek bilgi istendi', 'Uluslararası barışa katkı');
INSERT INTO public.degerlendirme (degerlendirme_id, aday_id, komite_id, tarih, sonuc, olcut) VALUES (4, 5, 1, '2025-10-06', 'KABUL', 'Özgünlük');
INSERT INTO public.degerlendirme (degerlendirme_id, aday_id, komite_id, tarih, sonuc, olcut) VALUES (5, 6, 2, '2025-10-07', 'RED', 'Özgünlük');
INSERT INTO public.degerlendirme (degerlendirme_id, aday_id, komite_id, tarih, sonuc, olcut) VALUES (6, 7, 4, '2025-10-08', 'KABUL', 'Özgünlük');


--
-- Data for Name: degerlendirme_komitesi; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.degerlendirme_komitesi (komite_id, komite_adi, kategori_id) VALUES (1, 'Fizik Değerlendirme Komitesi', 1);
INSERT INTO public.degerlendirme_komitesi (komite_id, komite_adi, kategori_id) VALUES (2, 'Tıp Değerlendirme Komitesi', 3);
INSERT INTO public.degerlendirme_komitesi (komite_id, komite_adi, kategori_id) VALUES (3, 'Barış Değerlendirme Komitesi', 5);
INSERT INTO public.degerlendirme_komitesi (komite_id, komite_adi, kategori_id) VALUES (4, 'Kimya Değerlendirme Komitesi', 2);


--
-- Data for Name: kategori; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.kategori (kategori_id, kategori_adi) VALUES (1, 'Fizik');
INSERT INTO public.kategori (kategori_id, kategori_adi) VALUES (2, 'Kimya');
INSERT INTO public.kategori (kategori_id, kategori_adi) VALUES (3, 'Tıp');
INSERT INTO public.kategori (kategori_id, kategori_adi) VALUES (4, 'Edebiyat');
INSERT INTO public.kategori (kategori_id, kategori_adi) VALUES (5, 'Barış');
INSERT INTO public.kategori (kategori_id, kategori_adi) VALUES (6, 'Ekonomi Bilimleri');


--
-- Data for Name: komite_uyesi; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.komite_uyesi (komite_id, uzman_id) VALUES (1, 1);
INSERT INTO public.komite_uyesi (komite_id, uzman_id) VALUES (1, 2);
INSERT INTO public.komite_uyesi (komite_id, uzman_id) VALUES (1, 3);
INSERT INTO public.komite_uyesi (komite_id, uzman_id) VALUES (2, 4);
INSERT INTO public.komite_uyesi (komite_id, uzman_id) VALUES (2, 5);
INSERT INTO public.komite_uyesi (komite_id, uzman_id) VALUES (2, 6);
INSERT INTO public.komite_uyesi (komite_id, uzman_id) VALUES (3, 7);
INSERT INTO public.komite_uyesi (komite_id, uzman_id) VALUES (3, 8);
INSERT INTO public.komite_uyesi (komite_id, uzman_id) VALUES (3, 9);
INSERT INTO public.komite_uyesi (komite_id, uzman_id) VALUES (4, 10);
INSERT INTO public.komite_uyesi (komite_id, uzman_id) VALUES (4, 11);
INSERT INTO public.komite_uyesi (komite_id, uzman_id) VALUES (4, 12);


--
-- Data for Name: kurulus; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.kurulus (kurulus_no, ad, konum, iletisim_bilgisi) VALUES (1, 'Küresel Bilim Akademisi', 'Stockholm, İsveç', 'bilim@example.org');
INSERT INTO public.kurulus (kurulus_no, ad, konum, iletisim_bilgisi) VALUES (2, 'Uluslararası Sağlık Enstitüsü', 'Cenevre, İsviçre', 'saglik@example.org');
INSERT INTO public.kurulus (kurulus_no, ad, konum, iletisim_bilgisi) VALUES (3, 'Dünya Barış Araştırmaları Merkezi', 'Oslo, Norveç', 'baris@example.org');
INSERT INTO public.kurulus (kurulus_no, ad, konum, iletisim_bilgisi) VALUES (4, 'CERN', 'Meyrin, İsviçre', 'cern.demo@example.org');
INSERT INTO public.kurulus (kurulus_no, ad, konum, iletisim_bilgisi) VALUES (5, 'Kuzey Sağlık Enstitüsü', 'Ankara, Türkiye', 'kuzey.saglik@example.org');
INSERT INTO public.kurulus (kurulus_no, ad, konum, iletisim_bilgisi) VALUES (6, 'Uluslararası Kimya Akademisi', 'İzmir, Türkiye', 'kimya.akademisi@example.org');


--
-- Data for Name: odul; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.odul (odul_no, aciklayici_ad, kategori_id) VALUES (1, 'Fizik alanında olağanüstü katkı', 1);
INSERT INTO public.odul (odul_no, aciklayici_ad, kategori_id) VALUES (2, 'Kimya alanında olağanüstü katkı', 2);
INSERT INTO public.odul (odul_no, aciklayici_ad, kategori_id) VALUES (3, 'Fizyoloji veya Tıp alanında olağanüstü katkı', 3);
INSERT INTO public.odul (odul_no, aciklayici_ad, kategori_id) VALUES (4, 'Edebiyata katkı', 4);
INSERT INTO public.odul (odul_no, aciklayici_ad, kategori_id) VALUES (5, 'Barış çalışmaları', 5);
INSERT INTO public.odul (odul_no, aciklayici_ad, kategori_id) VALUES (6, 'Ekonomi bilimlerine katkı', 6);
INSERT INTO public.odul (odul_no, aciklayici_ad, kategori_id) VALUES (7, 'Nobel Fizik Ödülü', 1);
INSERT INTO public.odul (odul_no, aciklayici_ad, kategori_id) VALUES (8, 'Nobel Fizyoloji veya Tıp Ödülü', 3);
INSERT INTO public.odul (odul_no, aciklayici_ad, kategori_id) VALUES (9, 'Nobel Kimya Ödülü', 2);


--
-- Data for Name: uzman; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.uzman (uzman_id, ad, adres, yas, cinsiyet, uzmanlik_alani) VALUES (1, 'Prof. Leyla Aksoy', 'Stockholm, İsveç', 58, 'Kadın', 'Kuantum fiziği');
INSERT INTO public.uzman (uzman_id, ad, adres, yas, cinsiyet, uzmanlik_alani) VALUES (2, 'Prof. Murat Erdem', 'Ankara, Türkiye', 62, 'Erkek', 'Teorik fizik');
INSERT INTO public.uzman (uzman_id, ad, adres, yas, cinsiyet, uzmanlik_alani) VALUES (3, 'Dr. Elif Arslan', 'İzmir, Türkiye', 45, 'Kadın', 'Parçacık fiziği');
INSERT INTO public.uzman (uzman_id, ad, adres, yas, cinsiyet, uzmanlik_alani) VALUES (4, 'Prof. Jonas Berg', 'Uppsala, İsveç', 54, 'Erkek', 'Tıp araştırmaları');
INSERT INTO public.uzman (uzman_id, ad, adres, yas, cinsiyet, uzmanlik_alani) VALUES (5, 'Dr. Sara Lind', 'Oslo, Norveç', 42, 'Kadın', 'Halk sağlığı');
INSERT INTO public.uzman (uzman_id, ad, adres, yas, cinsiyet, uzmanlik_alani) VALUES (6, 'Prof. Erik Holm', 'Bergen, Norveç', 60, 'Erkek', 'Biyomedikal bilimler');
INSERT INTO public.uzman (uzman_id, ad, adres, yas, cinsiyet, uzmanlik_alani) VALUES (7, 'Dr. Aylin Güneş', 'İstanbul, Türkiye', 49, 'Kadın', 'Barış çalışmaları');
INSERT INTO public.uzman (uzman_id, ad, adres, yas, cinsiyet, uzmanlik_alani) VALUES (8, 'Prof. Nils Hansen', 'Oslo, Norveç', 57, 'Erkek', 'Uluslararası ilişkiler');
INSERT INTO public.uzman (uzman_id, ad, adres, yas, cinsiyet, uzmanlik_alani) VALUES (9, 'Dr. Zeynep Koç', 'Ankara, Türkiye', 39, 'Kadın', 'İnsan hakları');
INSERT INTO public.uzman (uzman_id, ad, adres, yas, cinsiyet, uzmanlik_alani) VALUES (10, 'Prof. Nil Aksoy', 'İzmir, Türkiye', 51, 'Kadın', 'Sürdürülebilir kataliz');
INSERT INTO public.uzman (uzman_id, ad, adres, yas, cinsiyet, uzmanlik_alani) VALUES (11, 'Dr. Can Erdem', 'İzmir, Türkiye', 44, 'Erkek', 'Sürdürülebilir kataliz');
INSERT INTO public.uzman (uzman_id, ad, adres, yas, cinsiyet, uzmanlik_alani) VALUES (12, 'Prof. Ada Sönmez', 'İzmir, Türkiye', 56, 'Kadın', 'Sürdürülebilir kataliz');


--
-- Data for Name: uzman_oyu; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.uzman_oyu (oy_id, komite_id, uzman_id, aday_id, olcut, karar, oy_zamani) VALUES (1, 1, 1, 5, 'Özgünlük', 'KABUL', '2025-10-06 10:01:00');
INSERT INTO public.uzman_oyu (oy_id, komite_id, uzman_id, aday_id, olcut, karar, oy_zamani) VALUES (2, 1, 2, 5, 'Özgünlük', 'RED', '2025-10-06 10:02:00');
INSERT INTO public.uzman_oyu (oy_id, komite_id, uzman_id, aday_id, olcut, karar, oy_zamani) VALUES (3, 1, 3, 5, 'Özgünlük', 'KABUL', '2025-10-06 10:03:00');
INSERT INTO public.uzman_oyu (oy_id, komite_id, uzman_id, aday_id, olcut, karar, oy_zamani) VALUES (4, 2, 4, 6, 'Özgünlük', 'RED', '2025-10-07 10:01:00');
INSERT INTO public.uzman_oyu (oy_id, komite_id, uzman_id, aday_id, olcut, karar, oy_zamani) VALUES (5, 2, 5, 6, 'Özgünlük', 'KABUL', '2025-10-07 10:02:00');
INSERT INTO public.uzman_oyu (oy_id, komite_id, uzman_id, aday_id, olcut, karar, oy_zamani) VALUES (6, 2, 6, 6, 'Özgünlük', 'RED', '2025-10-07 10:03:00');
INSERT INTO public.uzman_oyu (oy_id, komite_id, uzman_id, aday_id, olcut, karar, oy_zamani) VALUES (7, 4, 10, 7, 'Özgünlük', 'KABUL', '2025-10-08 10:01:00');
INSERT INTO public.uzman_oyu (oy_id, komite_id, uzman_id, aday_id, olcut, karar, oy_zamani) VALUES (8, 4, 11, 7, 'Özgünlük', 'KABUL', '2025-10-08 10:02:00');
INSERT INTO public.uzman_oyu (oy_id, komite_id, uzman_id, aday_id, olcut, karar, oy_zamani) VALUES (9, 4, 12, 7, 'Özgünlük', 'KABUL', '2025-10-08 10:03:00');


--
-- Name: aday_aday_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.aday_aday_id_seq', 7, true);


--
-- Name: aday_gosterme_aday_gosterme_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.aday_gosterme_aday_gosterme_id_seq', 6, true);


--
-- Name: degerlendirme_degerlendirme_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.degerlendirme_degerlendirme_id_seq', 6, true);


--
-- Name: degerlendirme_komitesi_komite_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.degerlendirme_komitesi_komite_id_seq', 4, true);


--
-- Name: kategori_kategori_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.kategori_kategori_id_seq', 9, true);


--
-- Name: kurulus_kurulus_no_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.kurulus_kurulus_no_seq', 6, true);


--
-- Name: odul_odul_no_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.odul_odul_no_seq', 9, true);


--
-- Name: uzman_oyu_oy_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.uzman_oyu_oy_id_seq', 9, true);


--
-- Name: uzman_uzman_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.uzman_uzman_id_seq', 12, true);


--
-- Name: aday_gosterme aday_gosterme_kurulus_no_aday_id_odul_no_tarih_saat_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aday_gosterme
    ADD CONSTRAINT aday_gosterme_kurulus_no_aday_id_odul_no_tarih_saat_key UNIQUE (kurulus_no, aday_id, odul_no, tarih, saat);


--
-- Name: aday_gosterme aday_gosterme_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aday_gosterme
    ADD CONSTRAINT aday_gosterme_pkey PRIMARY KEY (aday_gosterme_id);


--
-- Name: aday aday_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aday
    ADD CONSTRAINT aday_pkey PRIMARY KEY (aday_id);


--
-- Name: degerlendirme_komitesi degerlendirme_komitesi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.degerlendirme_komitesi
    ADD CONSTRAINT degerlendirme_komitesi_pkey PRIMARY KEY (komite_id);


--
-- Name: degerlendirme degerlendirme_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.degerlendirme
    ADD CONSTRAINT degerlendirme_pkey PRIMARY KEY (degerlendirme_id);


--
-- Name: kategori kategori_kategori_adi_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kategori
    ADD CONSTRAINT kategori_kategori_adi_key UNIQUE (kategori_adi);


--
-- Name: kategori kategori_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kategori
    ADD CONSTRAINT kategori_pkey PRIMARY KEY (kategori_id);


--
-- Name: komite_uyesi komite_uyesi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.komite_uyesi
    ADD CONSTRAINT komite_uyesi_pkey PRIMARY KEY (komite_id, uzman_id);


--
-- Name: kurulus kurulus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kurulus
    ADD CONSTRAINT kurulus_pkey PRIMARY KEY (kurulus_no);


--
-- Name: odul odul_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.odul
    ADD CONSTRAINT odul_pkey PRIMARY KEY (odul_no);


--
-- Name: degerlendirme uq_degerlendirme_aday_komite_tarih_kesinlesmis; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.degerlendirme
    ADD CONSTRAINT uq_degerlendirme_aday_komite_tarih_kesinlesmis UNIQUE (aday_id, komite_id, tarih, kesinlesmis);


--
-- Name: uzman_oyu uq_uzman_oyu; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uzman_oyu
    ADD CONSTRAINT uq_uzman_oyu UNIQUE (komite_id, uzman_id, aday_id);


--
-- Name: uzman_oyu uzman_oyu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uzman_oyu
    ADD CONSTRAINT uzman_oyu_pkey PRIMARY KEY (oy_id);


--
-- Name: uzman uzman_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uzman
    ADD CONSTRAINT uzman_pkey PRIMARY KEY (uzman_id);


--
-- Name: ix_uzman_oyu_komite_aday; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_uzman_oyu_komite_aday ON public.uzman_oyu USING btree (komite_id, aday_id);


--
-- Name: degerlendirme_komitesi komite_insert_minimum_uyesi; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER komite_insert_minimum_uyesi AFTER INSERT ON public.degerlendirme_komitesi DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.enforce_committee_minimum_members();


--
-- Name: komite_uyesi komite_uyesi_delete_minimum_uyesi; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER komite_uyesi_delete_minimum_uyesi AFTER DELETE OR UPDATE ON public.komite_uyesi DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.enforce_committee_minimum_members();


--
-- Name: aday_gosterme aday_gosterme_aday_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aday_gosterme
    ADD CONSTRAINT aday_gosterme_aday_id_fkey FOREIGN KEY (aday_id) REFERENCES public.aday(aday_id) ON DELETE RESTRICT;


--
-- Name: aday_gosterme aday_gosterme_kurulus_no_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aday_gosterme
    ADD CONSTRAINT aday_gosterme_kurulus_no_fkey FOREIGN KEY (kurulus_no) REFERENCES public.kurulus(kurulus_no) ON DELETE RESTRICT;


--
-- Name: aday_gosterme aday_gosterme_odul_no_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aday_gosterme
    ADD CONSTRAINT aday_gosterme_odul_no_fkey FOREIGN KEY (odul_no) REFERENCES public.odul(odul_no) ON DELETE RESTRICT;


--
-- Name: degerlendirme degerlendirme_aday_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.degerlendirme
    ADD CONSTRAINT degerlendirme_aday_id_fkey FOREIGN KEY (aday_id) REFERENCES public.aday(aday_id) ON DELETE RESTRICT;


--
-- Name: degerlendirme degerlendirme_komite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.degerlendirme
    ADD CONSTRAINT degerlendirme_komite_id_fkey FOREIGN KEY (komite_id) REFERENCES public.degerlendirme_komitesi(komite_id) ON DELETE RESTRICT;


--
-- Name: degerlendirme_komitesi degerlendirme_komitesi_kategori_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.degerlendirme_komitesi
    ADD CONSTRAINT degerlendirme_komitesi_kategori_id_fkey FOREIGN KEY (kategori_id) REFERENCES public.kategori(kategori_id) ON DELETE RESTRICT;


--
-- Name: uzman_oyu fk_uzman_oyu_komite_uyesi; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uzman_oyu
    ADD CONSTRAINT fk_uzman_oyu_komite_uyesi FOREIGN KEY (komite_id, uzman_id) REFERENCES public.komite_uyesi(komite_id, uzman_id) ON DELETE CASCADE;


--
-- Name: komite_uyesi komite_uyesi_komite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.komite_uyesi
    ADD CONSTRAINT komite_uyesi_komite_id_fkey FOREIGN KEY (komite_id) REFERENCES public.degerlendirme_komitesi(komite_id) ON DELETE CASCADE;


--
-- Name: komite_uyesi komite_uyesi_uzman_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.komite_uyesi
    ADD CONSTRAINT komite_uyesi_uzman_id_fkey FOREIGN KEY (uzman_id) REFERENCES public.uzman(uzman_id) ON DELETE RESTRICT;


--
-- Name: odul odul_kategori_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.odul
    ADD CONSTRAINT odul_kategori_id_fkey FOREIGN KEY (kategori_id) REFERENCES public.kategori(kategori_id) ON DELETE RESTRICT;


--
-- Name: uzman_oyu uzman_oyu_aday_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uzman_oyu
    ADD CONSTRAINT uzman_oyu_aday_id_fkey FOREIGN KEY (aday_id) REFERENCES public.aday(aday_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict hRDexysrc9wjn1wP5fg7uOUYPkOB9LcbGs16W8z4vJaer9OctrBZVDEJLeUluTh
