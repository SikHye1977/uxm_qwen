import {db} from "@/backend/db";

export async function GET() {
  // 개발 환경에서만 사용하는 확인용 API
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, {status: 404});
  }

  try {
    const result = await db.query(`
      SELECT
        current_database() AS database_name,
        current_user AS database_user
    `);

    return Response.json({
      ok: true,
      ...result.rows[0],
    });
  } catch (error) {
    console.error("DB 연결 확인 실패:", error);

    return Response.json(
      {ok: false, error: "DB 연결에 실패했습니다."},
      {status: 503},
    );
  }
}
