-- Topics rise from the articles themselves: the needs of "תרבות וגילוי", the topics of "מהות", the radar keywords.
insert into mag_topics (id, label, question, color, position) values
  ('rest',       'מנוחה וצמצום',   'מה נשאר כשמורידים?',              '#5E7F8C', 1),
  ('belonging',  'שייכות וקהילה',  'איך מקום הופך אנשים ליחד?',        '#B5683C', 2),
  ('repair',     'שבר ותיקון',     'מה עושים עם השבר?',                '#A8862E', 3),
  ('meaning',    'משמעות ורוח',    'מה נותן לרגע משקל?',               '#6B5B8A', 4),
  ('city',       'עיר ואדריכלות',  'איך בונים מקום שמיטיב עם אנשים?',  '#3F5F7A', 5),
  ('machine',    'בינה ויצירה',    'מה נשאר אנושי ליד המכונה?',        '#8A4A5E', 6),
  ('nature',     'טבע',            'מה הטבע יודע שהעיר שכחה?',         '#4F7A55', 7)
on conflict (id) do update set label = excluded.label, question = excluded.question, color = excluded.color, position = excluded.position;

insert into mag_topic_map (source, hint, topic_id) values
  ('culture','מנוחה','rest'), ('culture','איזון','rest'),
  ('culture','שייכות','belonging'), ('culture','קהילה','belonging'), ('culture','אירוח','belonging'),
  ('culture','חוסן','repair'), ('culture','שינוי','repair'), ('culture','קבלת אי-שלמות','repair'),
  ('culture','משמעות','meaning'), ('culture','געגוע','meaning'), ('culture','זמן','meaning'),
  ('culture','חיבור לטבע','nature'),
  ('mahut','צמצום','rest'), ('mahut','רוח ומסורת','meaning'), ('mahut','אדריכלות ועיר','city'),
  ('mahut','בינה ומכונה','machine'), ('mahut','אמנות ומוזיקה','machine'), ('mahut','מדע ותודעה','machine'),
  ('ishy','ishy','repair'),
  ('radar','אדריכלות','city'), ('radar','התחדשות עירונית','city'), ('radar','חדשנות באדריכלות','city'),
  ('radar','אומנות בבינה מלאכותית','machine')
on conflict (source, hint) do update set topic_id = excluded.topic_id;

-- The editor's first overrides: two "מהות" articles that belong to the first issue's question.
insert into mag_article_topics (article_key, topic_id) values
  ('mahut:49e1a1d4-9338-47a2-adb9-49fa192b6b41','repair'),
  ('mahut:368298f8-6efe-4771-9f8a-5b7e101333fb','repair')
on conflict (article_key) do update set topic_id = excluded.topic_id;

-- Issue 01, built from what already exists.
insert into mag_issues (id, number, title, question, intro, status, published_at) values
  ('issue-01', 1, 'התפר המוזהב', 'מה עושים עם השבר?',
   'שלוש אפליקציות כתבו על אותו דבר בלי לדעת זו על זו. **השבר לא נמחק: בונים עליו.** מכלי חרס ביפן, דרך צפת של המאה ה-16, ועד גוף שמבקש לעצור.',
   'published', now())
on conflict (id) do nothing;

insert into mag_issue_items (issue_id, article_key, role, position, note) values
  ('issue-01','culture:9892913b-52a3-4a81-a20e-f0108022aba1','lead',1,'הכלי השבור שהתיקון שלו גלוי'),
  ('issue-01','mahut:49e1a1d4-9338-47a2-adb9-49fa192b6b41','support',2,'הגוף בונה גשר על החתך'),
  ('issue-01','culture:17203858-dda3-447a-a6ee-ca09c61b1b2a','support',3,'איסוף הניצוצות אחרי השבירה'),
  ('issue-01','ishy:532f74cc-41b5-422a-9c69-7d356c2ec7c5','support',4,'העצירה כנשימה, לא ככישלון'),
  ('issue-01','culture:5a51326c-e775-4557-a681-2d64607c5e5a','support',5,'חזרה כתנועה, לא כעונש'),
  ('issue-01','culture:fd7dc657-ca1e-4dca-97c1-dac3940391c9','support',6,'לחזור ולקחת את מה שנשכח'),
  ('issue-01','mahut:368298f8-6efe-4771-9f8a-5b7e101333fb','support',7,'מפגש שכותב מחדש את שני הצדדים')
on conflict (issue_id, article_key) do nothing;

-- Threads between articles that were written apart. The three inside issue 01 are approved; the rest wait for the editor.
insert into mag_threads (a_key, b_key, rule, insight, action, status) values
  ('culture:9892913b-52a3-4a81-a20e-f0108022aba1','mahut:49e1a1d4-9338-47a2-adb9-49fa192b6b41',
   'שניהם מסרבים למחוק את החתך.','**התיקון הוא שכבה חדשה**, לא חזרה למצב הקודם.','בשיפוץ מבנה ישן: להשאיר את התפר בין הישן לחדש גלוי.','approved'),
  ('culture:17203858-dda3-447a-a6ee-ca09c61b1b2a','culture:9892913b-52a3-4a81-a20e-f0108022aba1',
   'צפת ויפן, אותה תשובה לכלי שנשבר.','**השבירה היא תחילת העבודה**, לא סופה.','בהתחדשות עירונית: למפות מה נשאר בעל ערך לפני שמחליטים מה להרוס.','approved'),
  ('culture:c975a68f-b9ac-4336-ad85-f54d27cf5c76','ishy:532f74cc-41b5-422a-9c69-7d356c2ec7c5',
   'אי-עשייה מול דחף שלא נעצר.','**לעצור זו פעולה**, ולא היעדר פעולה.','לקבוע בלוח השבוע שעה אחת בלי תפוקה.','approved'),
  ('culture:fef92f8a-fa06-4257-ac9f-ed5207dc96f5','mahut:8da6bbc4-e174-48a2-bad5-c67b73ef1ada',
   'הריק כחומר: המרווח ביפן והדף הלבן.','**המרחב הריק מחזיק את מה שסביבו.**','בכיכר עירונית: להשאיר שטח בלי ייעוד, ולבדוק מי משתמש בו.','proposed'),
  ('culture:f7ad22ba-9559-4ea0-accc-04f1284836bb','mahut:3179b316-a879-498a-a913-36b1fcdec04e',
   'אוהל פתוח מארבע רוחות, והתרגשות לקראת אדם.','**אירוח מתחיל לפני שהאורח נכנס.**','בתכנון כניסה לבניין ציבורי: מה רואים מהרחוב לפני שנכנסים.','proposed'),
  ('culture:e8c4a029-b88c-4392-8537-cd9076167b60','mahut:3112843d-e1db-41bb-8090-7d245a959d5c',
   'המידה הנכונה השוודית, והצמצום המזוקק.','**די הוא מידה, לא ויתור.**','בתוכנית דירה: למחוק חדר אחד, ולבדוק מה השתפר.','proposed'),
  ('culture:e524665c-2b31-445a-b935-165bd2b22644','mahut:b68229d7-2bc5-4e15-aa48-fda41e1728e8',
   'השכונה כרקמה, והעיר כיצירה.','**עיר נקראת מהחצר, לא מהמפה.**','בתוכנית בינוי: לשרטט קודם את החצר המשותפת, ואחריה את הבניינים.','proposed'),
  ('culture:2a0a0bcd-8f6c-46da-8671-6c662d4878f1','ishy:db7d9c48-3c7b-451c-9cee-8524685d8c75',
   'עמידה שקטה מול קושי, וקול של ניסיון.','**חוסן הוא עמדה, לא מאמץ.**','לפני הצגה: משפט פתיחה אחד שמביא את הניסיון לחדר.','proposed'),
  ('culture:fca6c56c-95b4-4a4c-b9b4-e019455647db','mahut:797177fd-96c8-4dab-a1f9-7cd8adeeef07',
   'התהוות דרך ידע, ולמידה כברירה.','**לומדים גם ממה שמשאירים בחוץ.**','לבחור מקור אחד לנושא אחד, לשבוע.','proposed'),
  ('culture:8273670c-f3c8-4fdf-a5f3-295bd21b35cd','mahut:dacf10fc-0c27-4a3b-b93d-bbfde2c41e5a',
   'אי של מנוחה בזמן, וזיקוק כשהרעש דועך.','**ההפסקה היא שמאפשרת לשמוע.**','ברחוב מגורים: שעה שבועית בלי תנועה עוברת.','proposed')
on conflict (a_key, b_key) do nothing;
