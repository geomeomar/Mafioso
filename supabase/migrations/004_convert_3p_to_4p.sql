-- Migration: Convert all 3-player cases to 4-player
-- Adds a 4th character (innocent) to each former 3-player case
-- Changes player_count from 3 to 4

-- =============================================
-- STEP 1: Update all 3-player cases to 4-player
-- =============================================

UPDATE cases SET player_count = 4 WHERE case_code IN (
  'M-04', 'M-06', 'M-09',
  'T-03', 'T-04', 'T-07', 'T-09',
  'K-02', 'K-04', 'K-06', 'K-09',
  'B-02', 'B-05', 'B-08',
  'E-02', 'E-04', 'E-07', 'E-09'
);

-- =============================================
-- STEP 2: Insert 4th characters for each case
-- =============================================

-- MURDER CASES
INSERT INTO case_characters (case_id, character_name, character_order, public_profile, is_mafioso)
VALUES
  ((SELECT id FROM cases WHERE case_code = 'M-04'), 'ماجد', 4, 'مريض قديم كان بيزور العيادة كتير وعنده خلاف مالي مع الدكتور حازم. راجل في الخمسينات، عصبي ومش بيحب حد يتكلم في فلوسه.', false),
  ((SELECT id FROM cases WHERE case_code = 'M-06'), 'هاني', 4, 'ساكن في الدور الرابع، محاسب هادي ومعروف إنه بيرجع متأخر وكان بيدفع لعم حسن فلوس عشان يفتحله الباب بالليل.', false),
  ((SELECT id FROM cases WHERE case_code = 'M-09'), 'دكتور سامح', 4, 'طبيب زائر كان في المستشفى بالليل وعنده خلاف مع الدكتور ممدوح على ترقية. معروف إنه طموح وبيحب يوصل بأي طريقة.', false);

-- THEFT CASES
INSERT INTO case_characters (case_id, character_name, character_order, public_profile, is_mafioso)
VALUES
  ((SELECT id FROM cases WHERE case_code = 'T-03'), 'سمير', 4, 'زبون دائم في المحل ومعروف إنه بيشتري حاجات غالية وبيبيعها بره بسعر أعلى', false),
  ((SELECT id FROM cases WHERE case_code = 'T-04'), 'طارق', 4, 'ابن مدام سميرة اللي ساكن في المنيل وكان عارف إن أمه مسافرة وعنده مفتاح قديم', false),
  ((SELECT id FROM cases WHERE case_code = 'T-07'), 'حسن', 4, 'عامل في الورشة لسه جديد من شهرين وبيعرف كل المعدات ومكانها', false),
  ((SELECT id FROM cases WHERE case_code = 'T-09'), 'كريم', 4, 'فني صيانة المول اللي بيصلح الكاميرات والشاترات وعنده وصول لكل المحلات', false);

-- KIDNAPPING CASES
INSERT INTO case_characters (case_id, character_name, character_order, public_profile, is_mafioso)
VALUES
  ((SELECT id FROM cases WHERE case_code = 'K-02'), 'عم فتحي', 4, 'بياع خضار على العربية في نفس الشارع وكان بيتخانق مع عم حسن على أماكن الوقوف', false),
  ((SELECT id FROM cases WHERE case_code = 'K-04'), 'سامي', 4, 'الديليفري بتاع المطعم واللي بيعرف كل شوارع المنطقة ومواعيد أبو سمير', false),
  ((SELECT id FROM cases WHERE case_code = 'K-06'), 'ياسر', 4, 'المصور بتاع الفرح واللي كان بيلف في القاعة كلها وعنده صور لكل الناس', false),
  ((SELECT id FROM cases WHERE case_code = 'K-09'), 'مجدي', 4, 'بياع الجرايد في المحطة اللي بيشوف كل الناس اللي بتيجي وتروح', false);

-- BLACKMAIL CASES
INSERT INTO case_characters (case_id, character_name, character_order, public_profile, is_mafioso)
VALUES
  ((SELECT id FROM cases WHERE case_code = 'B-02'), 'مروان', 4, 'ويتر في الكافيه بقاله سنة وعارف كل حاجة بتحصل ومش مبسوط من ظروف شغله', false),
  ((SELECT id FROM cases WHERE case_code = 'B-05'), 'هاني', 4, 'الأوفيس بوي اللي بيدخل كل المكاتب ومعاه مفاتيح كل حاجة وبيسمع كل الكلام', false),
  ((SELECT id FROM cases WHERE case_code = 'B-08'), 'سامر', 4, 'منتج مستقل بيأجر الاستوديو ساعات وعنده مفتاح احتياطي ومش بيحب حازم', false);

-- MISSING EVIDENCE CASES
INSERT INTO case_characters (case_id, character_name, character_order, public_profile, is_mafioso)
VALUES
  ((SELECT id FROM cases WHERE case_code = 'E-02'), 'هالة', 4, 'سكرتيرة المدير المالي واللي عندها وصول لكل الملفات ومفاتيح المكاتب', false),
  ((SELECT id FROM cases WHERE case_code = 'E-04'), 'نادر', 4, 'متدرب جديد في المكتب بيصور كل حاجة على موبايله "عشان يتعلم"', false),
  ((SELECT id FROM cases WHERE case_code = 'E-07'), 'منى', 4, 'جارة تانية ساكنة في الدور اللي فوق وكانت في البيت وقت ما الصورة اتمسحت', false),
  ((SELECT id FROM cases WHERE case_code = 'E-09'), 'عادل', 4, 'فني المعمل اللي طبع التقرير وسلمه وكان عارف إن فيه نتيجة مهمة', false);

-- =============================================
-- STEP 3: Update innocent_secrets with 4th character red herrings
-- =============================================

-- Murder
UPDATE cases SET innocent_secrets = innocent_secrets || '; ماجد — كان بيهدد الدكتور حازم إنه هيرفع عليه قضية بسبب فاتورة علاج مبالغ فيها وراح العيادة ليلتها بس لقى الباب مفتوح وخاف ومشي' WHERE case_code = 'M-04';
UPDATE cases SET innocent_secrets = innocent_secrets || '; هاني — كان مديون لعم حسن بـ٣ شهور فلوس فتح الباب وليلة الجريمة نزل يكلمه بس سمع صوت خناقة وطلع جري على الشقة' WHERE case_code = 'M-06';
UPDATE cases SET innocent_secrets = innocent_secrets || '; دكتور سامح — كان عنده خناقة مع الدكتور ممدوح قبل الحادثة بساعة على الترقية واتشاف في الممر في وقت متأخر بس كان رايح يجيب ملف مريض' WHERE case_code = 'M-09';

-- Theft
UPDATE cases SET innocent_secrets = innocent_secrets || '; سمير — بيشتري حاجات من المحل وبيبيعها بره بسعر أعلى وكان في المحل يوم السرقة بيتفرج على بضاعة جديدة' WHERE case_code = 'T-03';
UPDATE cases SET innocent_secrets = innocent_secrets || '; طارق — ابن مدام سميرة وعنده مفتاح قديم للشقة وكان عارف إن أمه مسافرة بس بيقول إنه ماراحش الشقة من شهر' WHERE case_code = 'T-04';
UPDATE cases SET innocent_secrets = innocent_secrets || '; حسن — عامل جديد في الورشة من شهرين بيعرف كل المعدات ومكانها بس لسه مابيثقوش فيه كفاية' WHERE case_code = 'T-07';
UPDATE cases SET innocent_secrets = innocent_secrets || '; كريم — فني صيانة المول وعنده وصول لكل المحلات وكان بيصلح كاميرا في الممر قبل السرقة بيوم' WHERE case_code = 'T-09';

-- Kidnapping
UPDATE cases SET innocent_secrets = innocent_secrets || '; عم فتحي — كان بيتخانق مع عم حسن قبل ما يختفي بيوم وناس سمعته بيقول "هخلص منك" بس كان يقصد إنه هيشتكيه للمجلس المحلي' WHERE case_code = 'K-02';
UPDATE cases SET innocent_secrets = innocent_secrets || '; سامي — كان عنده مفتاح احتياطي للمطعم وعارف مواعيد أبو سمير بالظبط عشان بيوصّله أكل البيت كل يوم' WHERE case_code = 'K-04';
UPDATE cases SET innocent_secrets = innocent_secrets || '; ياسر — عنده صور لكل الناس في الفرح وكان بيدخل الأوض الخلفية عادي بس كان بيدور على إضاءة أحسن للتصوير' WHERE case_code = 'K-06';
UPDATE cases SET innocent_secrets = innocent_secrets || '; مجدي — شاف المحامية قبل ما تختفي بدقايق وكان بيكلمها بس كان بيبيعلها جرنال زي كل يوم' WHERE case_code = 'K-09';

-- Blackmail
UPDATE cases SET innocent_secrets = innocent_secrets || '; مروان — سمع التسجيل من ورا الكاونتر وعارف مين كان قاعد على أنهي ترابيزة بس خايف يتطرد لو اتكلم' WHERE case_code = 'B-02';
UPDATE cases SET innocent_secrets = innocent_secrets || '; هاني — كان في المكتب بالليل وقت ما الفيديو اتصور وعنده مفاتيح كل الأدراج بس كان بينضّف ورايح بيته' WHERE case_code = 'B-05';
UPDATE cases SET innocent_secrets = innocent_secrets || '; سامر — عنده مفتاح احتياطي للاستوديو وكان موجود يوم ما التسجيلات اتعدّلت بس كان بيسجل شغله الخاص' WHERE case_code = 'B-08';

-- Missing Evidence
UPDATE cases SET innocent_secrets = innocent_secrets || '; هالة — عندها وصول لكل الملفات ومفاتيح مكتب المدير بس كانت في إجازة مرضية يوم ما الفلاشة اختفت' WHERE case_code = 'E-02';
UPDATE cases SET innocent_secrets = innocent_secrets || '; نادر — كان بيصور مستندات على موبايله واتشاف وهو بيفتح الملفات بس كان بياخد نوتس عشان التدريب' WHERE case_code = 'E-04';
UPDATE cases SET innocent_secrets = innocent_secrets || '; منى — كانت في البيت وقت ما الصورة اتمسحت وسمعت صوت بس ماحبّتش تتدخل عشان مش بتحب المشاكل' WHERE case_code = 'E-07';
UPDATE cases SET innocent_secrets = innocent_secrets || '; عادل — هو اللي طبع التقرير وكان ممكن يعدّل فيه قبل ما يسلمه بس التقرير طلع مطابق للنتيجة الأصلية' WHERE case_code = 'E-09';
