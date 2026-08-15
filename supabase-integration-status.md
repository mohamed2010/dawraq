# حالة ربط Supabase

تم ربط مسار ترحيل زُهيرة بمشروع Supabase الفارغ التالي:

| البند | القيمة |
|---|---|
| Project ref | `ykaxyezjwpyycueqdflh` |
| Project URL | `https://ykaxyezjwpyycueqdflh.supabase.co` |
| المنطقة | `eu-west-1` |
| محرك قاعدة البيانات | PostgreSQL 17 |
| الحالة عند التحقق | `ACTIVE_HEALTHY` |

تم تطبيق ترحيل `create_zuhaira_tracker_schema` بنجاح في 14 أغسطس 2026. أنشأ الترحيل جداول `users` و`user_profiles` و`cycle_records` و`daily_entries`، إضافة إلى الأنواع اللازمة والقيود والمفاتيح الخارجية. تم تفعيل Row Level Security على الجداول، ولا توجد صفوف ابتدائية وقت التحقق.

## وضع الخصوصية وRLS

تُستخدم القاعدة حالياً من خادم Next.js فقط عبر اتصال PostgreSQL خادمي محمي؛ ولا يستخدم التطبيق واجهة Supabase REST أو Supabase Auth مباشرة. لذلك تبقى سياسات RLS العامة غير معرفة عمداً، فتمنع أدوار `anon` و`authenticated` من الوصول إلى جداول المتابعة بدلاً من منحها صلاحيات واسعة. يفرض الخادم عزل البيانات من خلال `userId` في كل استعلام. كما أُلغي تنفيذ الدالة المساعدة `public.rls_auto_enable()` من أدوار `PUBLIC` و`anon` و`authenticated` في الترحيل `revoke_rls_helper_access`.

تستخدم طبقة بيانات Next.js الآن `drizzle-orm/node-postgres` مع `pg`. تقبل اتصالاً آمناً من `DATABASE_URL` أو، عند تثبيت تكامل Supabase في Vercel، من `POSTGRES_URL` الذي يضيفه التكامل. يلزم ضبط متغيرات OAuth في Vercel بصورة منفصلة قبل أن تعمل المصادقة في الإنتاج.

## دور Vercel الخادمي المحدود

أُنشئ الدور `zuhiera_app` للخادم فقط، مع صلاحيات `SELECT` و`INSERT` و`UPDATE` و`DELETE` على جداول زُهيرة الأربع وتسلسلاتها، ومن دون صلاحيات إنشاء أدوار أو قواعد بيانات أو تجاوز RLS. يستعمل اتصال Vercel وضع **Supavisor Transaction Pooler** في المنطقة `eu-west-1` عبر المضيف `aws-1-eu-west-1.pooler.supabase.com:6543`؛ لا تُحفظ كلمة المرور أو رابط الاتصال الكامل في المستودع.

لأن خادم Next.js هو نقطة تطبيق العزل الموثوقة، أضاف الترحيل `0003_vercel_server_role_rls.sql` سياسات RLS صريحة لهذا الدور وحده. لا تمنح السياسات أي وصول لأدوار المتصفح `anon` أو `authenticated`. تم التحقق من CRUD لدور الخادم على `users` و`user_profiles` و`cycle_records` و`daily_entries` داخل معاملة انتهت بـ `ROLLBACK`، لذلك لم تُحفظ بيانات اختبار.

أكدت اختبارات الصلاحيات السلبية أيضاً رفض قراءة `auth.users` ورفض إنشاء جداول في مخطط `public` للدور `zuhiera_app` (رمز PostgreSQL `42501`). كما لم يعرض مستشار أمان Supabase أي تنبيهات بعد تطبيق السياسات.

المصدر الخارجي لتفاصيل تكامل Vercel وSupabase: <https://supabase.com/partners/catalog/vercel>.
