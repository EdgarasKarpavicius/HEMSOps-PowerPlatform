using System.Security.Cryptography;
using System.Text;

namespace Intelogy.HEMSOps.Plugins.Utils
{
    internal static class Sha256Hasher
    {
        public static string ComputeHash(string value)
        {
            using (var sha256 = SHA256.Create())
            {
                var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(value));
                var builder = new StringBuilder(hashBytes.Length * 2);

                foreach (var hashByte in hashBytes)
                {
                    builder.Append(hashByte.ToString("x2"));
                }

                return builder.ToString();
            }
        }
    }
}
